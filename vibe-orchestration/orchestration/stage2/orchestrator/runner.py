# Run-orchestration entry point: executes the LangGraph and persists the outcome to Snowflake.
# Co-authored with CoCo
"""
This is the seam that makes the orchestrator callable by anyone rather than by one person at a
terminal. run_graph_test.py used to own graph construction, execution and result printing; that
logic now lives here so the HTTP server, the CLI harness and any future caller all drive the
identical code path.

Result delivery is deliberately table-backed rather than response-backed. A full wave 0-5 run takes
minutes, which is longer than a synchronous HTTP request (or a SQL service function) should be held
open, so submit() returns a run_id immediately and the terminal state lands in ORCHESTRATION_RUNS.
The React layer reads that row. Nothing about the graph topology changes to accommodate this - the
LangGraph app is built and streamed exactly as before.

Two networks share this runner. The Cortex client, the SQL executor and the concurrency semaphore
are process-wide; the NodeContext is per-run, because it carries the ModuleSpec that decides which
agents a run talks to and which graph shape it executes.

Node lifecycle events are written as they happen, not at the end. That is what the autonomous
module's live agent-network visualisation reads: the UI polls the events feed and can show a node as
in-flight, because a RUNNING row exists before the agent call returns.
"""
from __future__ import annotations

import asyncio
import json
import time
import traceback
import uuid

from . import config, modules
from .clients.snowflake_client import CortexAgentClient, SessionTokenAuth
from .clients.sql_executor import SqlExecutor
from .graph.build import build_graph, describe_graph
from .graph.nodes import NodeContext
from .state import new_run_state


class ModuleUnavailable(RuntimeError):
    """Raised when a run is submitted to a module whose agents are not deployed yet.

    Surfaced as a 409 rather than a 500: it is a configuration state, not a fault, and the message
    names the agents that need to exist so the caller can act on it.
    """


def _json_arg(value) -> str:
    """Serialise a state fragment for a VARIANT bind. Bound as a string and parsed server-side
    with PARSE_JSON, so no user-supplied text is ever concatenated into SQL."""
    return json.dumps(value, default=str)


class OrchestrationRunner:
    """Owns the long-lived Snowflake clients and the in-process run registry.

    One instance per process. The Cortex client and SQL executor are created once and shared
    across runs; a semaphore bounds how many graphs execute concurrently so a burst of submissions
    cannot exhaust the warehouse or the agent concurrency limits.
    """

    def __init__(self):
        self._agent_client = CortexAgentClient(
            account_host=config.cortex_api_host(),
            auth=SessionTokenAuth(config.token_path()),
            timeout_s=config.agent_timeout_s(),
        )
        self._sql = SqlExecutor()
        self._sem = asyncio.Semaphore(config.max_concurrent_runs())
        self._tasks: dict[str, asyncio.Task] = {}

    # ------------------------------------------------------------ per-run wiring

    def _context(self, spec: modules.ModuleSpec) -> NodeContext:
        """A NodeContext per run. Cheap - it only binds the shared clients to a module spec."""
        return NodeContext(
            agent_client=self._agent_client,
            sql_exec=self._sql.run,
            module=spec,
            progress=self._write_event,
        )

    @staticmethod
    def _resolve(module: str | None) -> modules.ModuleSpec:
        spec = modules.get(module)          # raises ValueError on an unknown name
        if not spec.available:
            raise ModuleUnavailable(
                f"module '{spec.name}' is not deployed in this account. "
                f"Create these agents and set AUTONOMOUS_ENABLED=true on the service: "
                f"{', '.join(spec.missing) or 'n/a'}"
            )
        return spec

    # ------------------------------------------------------------ live events

    async def _write_event(self, event: dict):
        """Append one node lifecycle row. Called from nodes via ctx.progress.

        Exceptions are swallowed by the caller (NodeContext._emit) so a progress write can never
        fail a run; this keeps the SQL itself minimal for the same reason.
        """
        await self._sql.run(
            f"""INSERT INTO {config.events_table()}
                    (RUN_ID, MODULE, NODE_NAME, AGENT_NAME, WAVE_NO, ATTEMPT_NO,
                     STATUS, DURATION_MS, ERROR_MSG, DETAIL, EVENT_AT)
                SELECT %s, %s, %s, %s, %s, %s, %s, %s, %s, PARSE_JSON(%s), CURRENT_TIMESTAMP()""",
            (
                event.get("run_id"),
                event.get("module"),
                event.get("node_name"),
                event.get("agent_name"),
                event.get("wave_no"),
                event.get("attempt_no", 1),
                event.get("status"),
                event.get("duration_ms"),
                event.get("error_msg"),
                _json_arg(event.get("detail")),
            ),
        )

    def graph(self, module: str | None = None) -> dict:
        """Static topology for a module - the skeleton the UI draws before a run starts.

        Deliberately does NOT gate on spec.available: the front end needs to render the autonomous
        network diagram (greyed out) before those agents exist, which is the whole point of showing
        the module as present-but-unavailable rather than hiding it.
        """
        return describe_graph(self._context(modules.get(module)))

    async def ping_warehouse(self) -> None:
        """Resume the query warehouse so the first real run does not wait on it.

        WARMUP_PING is a no-op procedure whose only purpose is to force a warehouse resume. Called at
        service startup; a suspended warehouse otherwise adds its resume latency to whichever wave-2
        branch happens to issue the first Tier C check.
        """
        await self._sql.run(f"CALL {config.fqn('WARMUP_PING')}()")

    async def events(self, run_id: str, after_seq: int = 0) -> list[dict]:
        """Node lifecycle feed for the live network visualisation.

        Ordered by EVENT_AT, not SEQ_NO. Snowflake's AUTOINCREMENT allocates values in per-writer
        blocks, so with wave 2 writing from four concurrent branches the sequence does NOT follow
        insert time - observed live: a node's RUNNING row received SEQ_NO 206 while its own completion
        row received 105. Ordering by SEQ_NO therefore reported finished nodes as still in flight.

        after_seq is retained as an opaque cursor for callers that want to poll incrementally, but it
        filters on SEQ_NO and is best-effort for the same reason. Event volume is ~20 rows per run, so
        the correct default for the UI is to re-read the whole run and redraw.
        """
        rows = await self._sql.run(
            f"""SELECT SEQ_NO, RUN_ID, MODULE, NODE_NAME, AGENT_NAME, WAVE_NO, ATTEMPT_NO,
                       STATUS, DURATION_MS, ERROR_MSG, DETAIL, EVENT_AT
                FROM {config.events_table()}
                WHERE RUN_ID = %s AND SEQ_NO > %s
                ORDER BY EVENT_AT, SEQ_NO""",
            (run_id, after_seq),
        )
        out = []
        for r in rows:
            detail = r.get("DETAIL")
            if isinstance(detail, str) and detail:
                try:
                    detail = json.loads(detail)
                except json.JSONDecodeError:
                    pass
            out.append({
                "seq_no": r.get("SEQ_NO"),
                "run_id": r.get("RUN_ID"),
                "module": r.get("MODULE"),
                "node_name": r.get("NODE_NAME"),
                "agent_name": r.get("AGENT_NAME"),
                "wave_no": r.get("WAVE_NO"),
                "attempt_no": r.get("ATTEMPT_NO"),
                "status": r.get("STATUS"),
                "duration_ms": r.get("DURATION_MS"),
                "error_msg": r.get("ERROR_MSG"),
                "detail": detail,
                "event_at": str(r.get("EVENT_AT") or ""),
            })
        return out

    # ------------------------------------------------------------ persistence

    async def _insert_queued(self, run_id: str, spec: modules.ModuleSpec, question: str,
                             persona_hint: str | None, personas: list[str], scope: dict):
        await self._sql.run(
            f"""INSERT INTO {config.results_table()}
                    (RUN_ID, MODULE, QUESTION, PERSONA_HINT, PERSONAS, SCOPE,
                     STATUS, SUBMITTED_AT)
                SELECT %s, %s, %s, %s, PARSE_JSON(%s), PARSE_JSON(%s),
                       'QUEUED', CURRENT_TIMESTAMP()""",
            (run_id, spec.name, question, persona_hint,
             _json_arg(personas), _json_arg(scope)),
        )

    async def _mark_running(self, run_id: str):
        await self._sql.run(
            f"UPDATE {config.results_table()} "
            f"SET STATUS = 'RUNNING', STARTED_AT = CURRENT_TIMESTAMP() WHERE RUN_ID = %s",
            (run_id,),
        )

    async def _mark_complete(self, run_id: str, state: dict, duration_ms: int):
        await self._sql.run(
            f"""UPDATE {config.results_table()} SET
                    STATUS        = 'COMPLETED',
                    COMPLETED_AT  = CURRENT_TIMESTAMP(),
                    DURATION_MS   = %s,
                    PLAN          = PARSE_JSON(%s),
                    FINDINGS      = PARSE_JSON(%s),
                    VALIDATION    = PARSE_JSON(%s),
                    NODE_TIMINGS  = PARSE_JSON(%s),
                    RUN_ERRORS    = PARSE_JSON(%s),
                    NARRATIVE     = %s,
                    EXEC_REPORT   = PARSE_JSON(%s),
                    RESULT        = PARSE_JSON(%s)
                WHERE RUN_ID = %s""",
            (
                duration_ms,
                _json_arg(state.get("plan")),
                _json_arg(state.get("findings", [])),
                _json_arg(state.get("validation")),
                _json_arg(state.get("node_timings", {})),
                _json_arg(state.get("errors", [])),
                state.get("narrative") or "",
                _json_arg(state.get("exec_report")),
                _json_arg(self._envelope(state, duration_ms)),
                run_id,
            ),
        )

    async def _mark_failed(self, run_id: str, error: str, duration_ms: int):
        await self._sql.run(
            f"""UPDATE {config.results_table()} SET
                    STATUS = 'FAILED', COMPLETED_AT = CURRENT_TIMESTAMP(),
                    DURATION_MS = %s, ERROR_MESSAGE = %s
                WHERE RUN_ID = %s""",
            (duration_ms, error[:4000], run_id),
        )

    # ------------------------------------------------------------ result shape

    @staticmethod
    def _envelope(state: dict, duration_ms: int) -> dict:
        """The single JSON object the React layer consumes.

        Kept flat and explicit rather than dumping raw LangGraph state, so the UI contract does not
        silently change when an internal state key is renamed.
        """
        return {
            "run_id": state.get("run_id"),
            "module": state.get("module"),
            "question": state.get("question"),
            "personas": state.get("personas", []),
            "scope": state.get("scope", {}),
            "duration_ms": duration_ms,
            "plan": state.get("plan"),
            "needs_clarification": bool(state.get("needs_clarification", False)),
            "persona": state.get("persona"),
            "persona_resolution": state.get("persona_resolution"),
            "artifact_audit": state.get("artifact_audit"),
            "artifacts": state.get("artifacts", []),
            "findings": state.get("findings", []),
            "prescriptive": state.get("prescriptive"),
            "validation": state.get("validation"),
            "chart_refs": state.get("chart_refs", []),
            "narrative": state.get("narrative"),
            "exec_report": state.get("exec_report"),
            "errors": state.get("errors", []),
            "node_timings": state.get("node_timings", {}),
        }

    # ------------------------------------------------------------ execution

    async def _execute(self, run_id: str, spec: modules.ModuleSpec, question: str,
                       persona_title: str, department: str, scope: dict) -> dict:
        async with self._sem:
            t0 = time.time()
            await self._mark_running(run_id)
            try:
                app = build_graph(self._context(spec))
                state = new_run_state(run_id, thread_id=run_id, question=question,
                                      module=spec.name, personas=[persona_title] if persona_title else [],
                                      scope=scope, persona_title=persona_title,
                                      department=department)
                cfg = {"configurable": {"thread_id": run_id}}

                # Streamed rather than invoked so per-node completion is observable in service
                # logs; the accumulated state is read back from the checkpointer afterwards.
                async for _ in app.astream(state, config=cfg, stream_mode="updates"):
                    pass

                final = dict(app.get_state(cfg).values)
                duration_ms = int((time.time() - t0) * 1000)
                await self._mark_complete(run_id, final, duration_ms)
                return self._envelope(final, duration_ms)
            except Exception:
                duration_ms = int((time.time() - t0) * 1000)
                detail = traceback.format_exc()
                try:
                    await self._mark_failed(run_id, detail, duration_ms)
                except Exception:
                    pass  # a failed status write must not mask the original failure
                raise
            finally:
                self._tasks.pop(run_id, None)

    async def _validate_inputs(self, spec: modules.ModuleSpec, question: str,
                               persona_title: str, department: str) -> None:
        """Reject a malformed submission before a warehouse is resumed or an agent is billed.

        Persona validity is checked HERE as well as in persona_resolve. Catching it at the API
        boundary means the caller gets a synchronous 400 with the valid titles, instead of a run that
        is accepted, queued, and then fails a minute later inside the graph.
        """
        if spec.requires_question and not (question or "").strip():
            raise ValueError(f"module '{spec.name}' requires a question")
        if spec.requires_personas and not (persona_title or "").strip():
            raise ValueError(f"module '{spec.name}' requires a persona title")
        if not (persona_title or "").strip():
            return
        rows = await self._sql.run(
            f"CALL {config.fqn('RESOLVE_PERSONA_SCOPE')}(%s, %s)",
            (persona_title.strip(), department.strip() or None))
        res = json.loads(rows[0][list(rows[0].keys())[0]]) if rows else {}
        if res.get("status") != "RESOLVED":
            valid = res.get("valid_titles") or res.get("valid_departments") or []
            raise ValueError(
                f"{res.get('reason') or 'persona could not be resolved'}"
                + (f". Valid: {', '.join(map(str, valid))}" if valid else ""))

    async def submit(self, question: str = "", persona_hint: str | None = None,
                     run_id: str | None = None, module: str | None = None,
                     personas: list[str] | None = None, scope: dict | None = None,
                     department: str | None = None) -> dict:
        """Queue a run and return immediately with its identifiers.

        A run is for ONE persona title. `personas` is retained for backward compatibility and its
        first element is treated as the title; `department` optionally narrows the scope.
        """
        spec = self._resolve(module)
        title = (persona_hint or (personas[0] if personas else "") or "").strip()
        department = (department or "").strip()
        scope = scope or {}
        await self._validate_inputs(spec, question, title, department)

        run_id = run_id or f"run-{uuid.uuid4().hex[:12]}"
        await self._insert_queued(run_id, spec, question, title, [title] if title else [], scope)
        self._tasks[run_id] = asyncio.create_task(
            self._execute(run_id, spec, question, title, department, scope))
        return {"run_id": run_id, "module": spec.name, "status": "QUEUED",
                "persona_title": title, "department": department or None}

    async def run_sync(self, question: str = "", persona_hint: str | None = None,
                       run_id: str | None = None, module: str | None = None,
                       personas: list[str] | None = None, scope: dict | None = None,
                       department: str | None = None) -> dict:
        """Run to completion and return the result envelope. Only appropriate for callers that can
        tolerate a multi-minute wait."""
        spec = self._resolve(module)
        title = (persona_hint or (personas[0] if personas else "") or "").strip()
        department = (department or "").strip()
        scope = scope or {}
        await self._validate_inputs(spec, question, title, department)

        run_id = run_id or f"run-{uuid.uuid4().hex[:12]}"
        await self._insert_queued(run_id, spec, question, title, [title] if title else [], scope)
        return await self._execute(run_id, spec, question, title, department, scope)

    async def status(self, run_id: str) -> dict | None:
        rows = await self._sql.run(
            f"""SELECT RUN_ID, MODULE, QUESTION, PERSONAS, STATUS, SUBMITTED_AT, STARTED_AT,
                       COMPLETED_AT, DURATION_MS, ERROR_MESSAGE, RESULT
                FROM {config.results_table()} WHERE RUN_ID = %s""",
            (run_id,),
        )
        if not rows:
            return None
        row = rows[0]

        def _maybe_json(value):
            if isinstance(value, str) and value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return value

        return {
            "run_id": row.get("RUN_ID"),
            "module": row.get("MODULE"),
            "question": row.get("QUESTION"),
            "personas": _maybe_json(row.get("PERSONAS")) or [],
            "status": row.get("STATUS"),
            "submitted_at": str(row.get("SUBMITTED_AT") or ""),
            "started_at": str(row.get("STARTED_AT") or ""),
            "completed_at": str(row.get("COMPLETED_AT") or ""),
            "duration_ms": row.get("DURATION_MS"),
            "error_message": row.get("ERROR_MESSAGE"),
            "result": _maybe_json(row.get("RESULT")),
        }

    def close(self):
        self._sql.close()

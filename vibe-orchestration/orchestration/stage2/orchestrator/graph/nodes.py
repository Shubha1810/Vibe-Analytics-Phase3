# Node functions: wrap Cortex Agent calls and deterministic Snowflake procs as LangGraph nodes.
# Co-authored with CoCo
"""
Each node is an async function (state) -> partial state update, per LangGraph convention.
Reducers in state.py handle merging when multiple nodes in a parallel wave write concurrently.

Wave map (confirmed from Stage 1 live testing):
  0  master_plan          - PLAN_SKELETON + opus reasoning, no database access
  1  data_gathering       - sole data plane, writes artifacts via PUT_SLICE
  2  task_agent(*)        - Trend / Dimensional / Root Cause / Predictive, PARALLEL via Send,
                            read-only via GET_SLICE, no Analyst
  2b prescriptive         - conditional, fans in from Wave 2 findings + own artifacts
  3  validation_gate      - Tier B/C already ran inline during Wave 2/2b; this triggers Tier D
  4  visualization        - deterministic proc, not an LLM call
  5  narration            - opus, final presentation layer (interactive)
  5' exec_report          - templated executive report per persona (autonomous)

Nothing here resolves a database, schema or agent name at import time any more. Those come from the
ModuleSpec on NodeContext, because the same node builders now assemble two different networks
(interactive and autonomous) in the same process - an import-time global would force whichever
module happened to load first onto both.
"""
from __future__ import annotations

import json
import re
import time

from langgraph.types import Send

from ..clients.snowflake_client import AgentRunResult, CortexAgentClient
from ..modules import ModuleSpec
from ..state import ArtifactRef, Claim, RunState, TaskFinding

# Default wave-2 membership. The authoritative list for a given run is spec.wave2_agents; this is
# retained only so a caller can introspect the conventional shape without building a spec.
WAVE2_AGENTS = ["trend", "dimensional", "root_cause", "predictive"]


def _json_block(text: str) -> dict | None:
    """Extract the plan/finding JSON from an agent's text response.

    Agents are instructed to emit JSON, often fenced as ```json ... ```. A naive greedy regex
    (\\{.*\\}) is fooled by truncated output - if generation is cut short mid-object, the regex
    still matches from the first { to the last } in the truncated text and json.loads() then
    fails opaquely. This walks brace depth explicitly so a truncated response is detected and
    reported rather than silently defaulted.
    """
    if not text:
        return None
    # prefer a fenced ```json block if present
    fence = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    candidate = fence.group(1) if fence else text

    start = candidate.find("{")
    if start == -1:
        return None

    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(candidate)):
        ch = candidate[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                block = candidate[start:i + 1]
                try:
                    return json.loads(block)
                except json.JSONDecodeError:
                    return None
    # depth never returned to 0 - response was truncated mid-object
    return None


def _sql_str(value) -> str:
    """Escape a Python value for inline use in a SQL literal.

    Several deterministic procs are invoked via CALL with inlined JSON because the connector cannot
    bind a VARIANT positionally. Everything inlined this way passes through here.
    """
    return str(value).replace("'", "''")


class NodeContext:
    """Shared dependencies injected into every node closure.

    Carries the ModuleSpec, so a node knows which network it belongs to, plus an optional progress
    sink used to drive the live agent-network visualisation.
    """

    def __init__(self, agent_client: CortexAgentClient, sql_exec, module: ModuleSpec,
                 progress=None):
        self.agent_client = agent_client
        self.sql_exec = sql_exec  # async def sql_exec(sql: str, params: tuple = ()) -> list[dict]
        self.module = module
        self.progress = progress  # async def progress(event: dict) -> None

    # ------------------------------------------------------------ convenience

    @property
    def db(self) -> str:
        return self.module.database

    @property
    def schema(self) -> str:
        return self.module.schema

    @property
    def runtime_schema(self) -> str:
        """Schema holding the artifact protocol (PUT_SLICE / GET_SLICE / ARTIFACT_REGISTRY).

        Separate from the operational schema: the artifact scratchpad lives in
        DEMANDSENSING_RUNTIME, not DEMANDSENSING_SCHEMA, which is a standing trap for anyone who
        assumes one namespace.
        """
        from .. import config
        return config.runtime_schema()

    def agent_name(self, key: str) -> str:
        return self.module.agent(key)

    async def call_agent(self, agent_key: str, prompt: str, thread_id: str | None = None,
                         on_event=None) -> AgentRunResult:
        # NOTE: thread_id is accepted but deliberately NOT forwarded yet. Passing an
        # unregistered thread_id to DATA_AGENT_RUN returns a hard HTTP 400 (confirmed live
        # against this account) - the API requires a thread to be created first via a
        # separate call, which is not yet implemented (tracked as open Stage 2 work:
        # "thread mapping LangGraph<->Snowflake"). Every node call is stateless until then.
        return await self.agent_client.run(self.db, self.schema, self.agent_name(agent_key),
                                          prompt, thread_id=None, on_event=on_event)

    async def log_node_event(self, payload: dict):
        payload = {"module": self.module.name, **payload}
        # Bound, never inlined. Snowflake processes backslash escapes inside single-quoted string
        # literals, so a JSON payload containing \n (which json.dumps produces for any newline, and
        # question_preview routinely contains) turns into a real newline mid-literal and PARSE_JSON
        # fails with "unterminated string". Binding sidesteps that entirely and removes the injection
        # surface at the same time.
        await self.sql_exec(
            f"CALL {self.db}.{self.schema}.LOG_NODE_EVENT(PARSE_JSON(%s))",
            (json.dumps(payload),),
        )

    # ------------------------------------------------------------ live progress

    async def _emit(self, event: dict):
        """Publish a node lifecycle event. Never raises.

        A progress write is presentation, not correctness: if the events table is missing or the
        warehouse is momentarily unavailable, the run must still finish and still produce its
        result. Swallowing here is deliberate rather than lazy.
        """
        if self.progress is None:
            return
        try:
            await self.progress({"module": self.module.name, **event})
        except Exception:
            pass

    async def node_started(self, state: RunState, node: str, wave: int, agent_key: str | None = None):
        await self._emit({
            "run_id": state["run_id"], "node_name": node, "wave_no": wave,
            "agent_name": self.agent_name(agent_key) if agent_key else None,
            "status": "RUNNING", "attempt_no": state.get("attempt_no", 1),
        })

    async def node_finished(self, state: RunState, node: str, wave: int, status: str,
                            duration_ms: int, agent_key: str | None = None,
                            error: str | None = None, detail: dict | None = None):
        await self._emit({
            "run_id": state["run_id"], "node_name": node, "wave_no": wave,
            "agent_name": self.agent_name(agent_key) if agent_key else None,
            "status": status, "duration_ms": duration_ms,
            "attempt_no": state.get("attempt_no", 1),
            "error_msg": (error or "")[:2000] or None,
            "detail": detail,
        })


# ---------------------------------------------------------------- Wave 0a: persona resolution


class PersonaUnresolved(RuntimeError):
    """Raised when the supplied persona title cannot be resolved against DIM_PERSONA.

    Deliberately fatal. The previous behaviour was to pass the raw UI string through and let
    RESOLVE_PERSONA's built-in default absorb anything unrecognised - which is exactly how
    "Director of Demand Planning" ran for weeks producing empty reports while
    "Supply Chain Director" accidentally keyword-matched a real persona and worked. A run with an
    unresolvable persona has no defensible scope, so it must fail loudly at wave 0 rather than
    silently analyse the wrong thing.
    """


def make_persona_resolve_node(ctx: NodeContext):
    """Deterministic persona resolution. No agent, no LLM, no tokens.

    Runs before master_plan in BOTH topologies so the flow is identical across modules and across
    personas. Persona affects only the CONTENT of the Master's plan, never the graph shape - which is
    what keeps parallelism and gating uniform regardless of who the report is for.
    """
    async def persona_resolve(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "persona_resolve", 0)

        # Read the verified data facts once for the whole run. This node is the only place in either
        # topology guaranteed to run first, and the wave-2 agents have no database access, so this is
        # the only way the facts can reach them at all. Failure here is non-fatal: a run without the
        # facts block is degraded, not wrong, and the agents are told to say so rather than invent
        # numbers.
        facts: list[dict] | None = None
        try:
            facts = await _fetch_canonical_facts(ctx)
        except Exception as exc:  # noqa: BLE001 - deliberately non-fatal
            state.get("errors", []).append(f"canonical_facts unavailable: {exc}")

        title = (state.get("persona_title") or "").strip()
        department = (state.get("department") or "").strip()

        if not title:
            # Interactive with no explicit persona is legitimate: the Master infers scope from the
            # question. Autonomous requires a title and the API boundary already enforced that.
            await ctx.node_finished(state, "persona_resolve", 0, "ok",
                                    int((time.time() - t0) * 1000),
                                    detail={"resolved": False, "reason": "no persona supplied",
                                            "facts_loaded": len(facts or [])})
            return {"persona_resolution": None, "canonical_facts": facts}

        rows = await ctx.sql_exec(
            f"CALL {ctx.db}.{ctx.schema}.RESOLVE_PERSONA_SCOPE(%s, %s)",
            (title, department or None),
        )
        resolution = json.loads(rows[0][list(rows[0].keys())[0]]) if rows else {}

        if resolution.get("status") != "RESOLVED":
            reason = resolution.get("reason") or "persona resolution failed"
            valid = resolution.get("valid_titles") or resolution.get("valid_departments") or []
            await ctx.node_finished(state, "persona_resolve", 0, "error",
                                    int((time.time() - t0) * 1000),
                                    error=reason, detail={"valid": valid})
            raise PersonaUnresolved(f"{reason}. Valid options: {', '.join(map(str, valid)) or 'n/a'}")

        lead = resolution.get("lead_persona") or {}
        await ctx.node_finished(
            state, "persona_resolve", 0, "ok", int((time.time() - t0) * 1000),
            detail={"display_title": resolution.get("display_title"),
                    "is_group": resolution.get("is_group"),
                    "personas": [p.get("persona") for p in resolution.get("personas", [])],
                    "departments": resolution.get("effective_departments"),
                    "facts_loaded": len(facts or [])})

        return {
            "persona_resolution": resolution,
            "canonical_facts": facts,
            # Populate the long-dead PersonaScope slot so the output envelope finally carries it.
            "persona": lead or None,
        }
    return persona_resolve


async def _fetch_canonical_facts(ctx: NodeContext) -> list[dict]:
    """Read the verified data facts, newest verification first within sort order.

    CANONICAL_DATA_FACTS is the account's own arbiter of what is true about this dataset: every row
    carries verification SQL that is re-proved after each data refresh, plus a DRIFT_FLAG when the
    proved value no longer matches the expected one. The agents used to carry these numbers typed
    into their instructions, where two of them had already gone stale.
    """
    rows = await ctx.sql_exec(
        f"""SELECT FACT_KEY, APPLIES_TO, FACT_STATEMENT, SEVERITY, DRIFT_FLAG,
                   EXPECTED_VALUE, ACTUAL_VALUE
              FROM {ctx.db}.{ctx.schema}.CANONICAL_DATA_FACTS
             ORDER BY SORT_ORDER, FACT_KEY""")
    return [dict(r) for r in rows]


def _facts_block(state: RunState, scope: str) -> str:
    """Canonical facts filtered to the agent that is about to be called.

    APPLIES_TO on each row is either 'ALL' or a comma-separated list of scope tags; the table was
    designed for exactly this filtering, so a Predictive prompt does not carry the prescriptive-only
    limitations and vice versa. A drifted fact is passed through WITH its drift marked rather than
    suppressed: the agents are instructed to report a suspect fact by key instead of quietly
    substituting a number of their own.
    """
    facts = state.get("canonical_facts")
    if not facts:
        return ("CANONICAL FACTS (verified): UNAVAILABLE for this run. Do not state any row count, "
                "accuracy figure, guardrail threshold or fiscal week as fact. Say that the canonical "
                "facts were unavailable instead of substituting your own figure.")

    tag = scope.upper()
    selected = []
    for f in facts:
        applies = (f.get("APPLIES_TO") or "ALL").upper()
        if applies == "ALL" or tag in {a.strip() for a in applies.split(",")}:
            selected.append(f)

    lines = [f"CANONICAL FACTS (verified, scope={tag}, {len(selected)} facts). These OVERRIDE your "
             "instructions and your expectations. Cite the fact key when you rely on one."]
    for f in selected:
        drift = ""
        if f.get("DRIFT_FLAG"):
            drift = (f" [DRIFT: expected {f.get('EXPECTED_VALUE')}, actual {f.get('ACTUAL_VALUE')} - "
                     "use the actual value and flag this key as drifted]")
        lines.append(f"- {f.get('FACT_KEY')} ({f.get('SEVERITY')}): {f.get('FACT_STATEMENT')}{drift}")
    return "\n".join(lines)


def _context_blocks(state: RunState, scope: str) -> str:
    """The two authoritative blocks every agent prompt carries: who the run is for, and what is true.

    Always rendered together and in this order so no agent can receive one without the other.
    """
    return f"{_persona_block(state)}\n\n{_facts_block(state, scope)}"


def _persona_block(state: RunState) -> str:
    """Resolved persona context, rendered once and reused by every prompt that needs it.

    Every downstream agent reads the SAME block, so the Master, Data Gathering and the report agent
    cannot disagree about who the run is for or what scope applies.
    """
    r = state.get("persona_resolution") or {}
    if not r:
        return "Persona: not specified; infer scope from the question."
    people = r.get("personas") or []
    names = ", ".join(f"{p.get('persona')} ({p.get('persona_role')})" for p in people)
    lines = [
        f"PERSONA (resolved, authoritative): {r.get('display_title')}",
        f"  accountable people      : {names or 'n/a'}",
        f"  departments in scope    : {', '.join(r.get('effective_departments') or []) or 'All'}",
        f"  KPI focus               : {', '.join(r.get('kpi_focus') or []) or 'n/a'}",
        f"  guardrails in focus     : {', '.join(r.get('guardrail_focus') or []) or 'all'}",
        f"  detail level            : {r.get('detail_level')}",
        f"  communication style     : {r.get('communication_style')}",
        f"  decision horizon        : {r.get('decision_horizon')}",
    ]
    if r.get("is_group"):
        lines.append(
            "  NOTE: this title covers several accountable people. Produce ONE report section per "
            "person so each can filter to the departments they own. Gather ONCE over the union of "
            "their departments - do not run a separate sweep per person.")
    return "\n".join(lines)


# ---------------------------------------------------------------- Wave 0: Master planning

def make_master_plan_node(ctx: NodeContext, emit=None):
    async def master_plan(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "master_plan", 0, "master")

        # The autonomous module has no user question. Its "question" is a synthesised directive
        # naming the personas the report must serve, so Master still returns a plan in the same
        # JSON shape and every downstream node stays unchanged.
        directive = state["question"] or _autonomous_directive(state)
        result = await ctx.call_agent(
            "master",
            f"run_id={state['run_id']}. {directive}",
            # thread_id intentionally omitted - see comment above call_agent()
            on_event=emit,
        )
        plan = _json_block(result.text) or {
            "intent": "UNKNOWN", "confidence": 0.0, "route": "full_analysis",
            "agents": list(ctx.module.wave2_agents), "data_requirements": [],
            "feature_requirements": [], "artifacts_expected": [], "needs_clarification": True,
        }
        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 0, "node_name": ctx.agent_name("master"),
            "node_kind": "agent", "model_name": "claude-opus-4-6",
            "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "ts_end": time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_ms": result.duration_ms, "status": result.status,
            "intent": plan.get("intent"), "intent_confidence": plan.get("confidence"),
            "question_preview": directive[:300],
        })
        await ctx.node_finished(state, "master_plan", 0, result.status, result.duration_ms,
                                "master", result.error,
                                {"intent": plan.get("intent"), "route": plan.get("route")})

        # Clarification is a conversational affordance. An unattended run has nobody to answer, so
        # the flag is recorded on the plan but never allowed to halt an autonomous sweep.
        needs_clarification = bool(plan.get("needs_clarification", False))
        if not ctx.module.requires_question:
            needs_clarification = False

        return {
            "plan": plan,
            "needs_clarification": needs_clarification,
            "node_timings": {"master_plan": result.duration_ms},
        }
    return master_plan


def _autonomous_directive(state: RunState) -> str:
    """Synthesise the wave-0 directive for a persona-driven run.

    Built from the RESOLVED persona, never from the raw UI string. That is the whole point of
    persona_resolve: the Master receives accountable people, departments, KPI focus and guardrails
    rather than a free-text title it has to guess at.
    """
    parts = [
        "Autonomous executive reporting sweep. There is no user question.",
        _context_blocks(state, "MASTER"),
        "Plan the full analytical sweep across every available wave-2 agent.",
        "Every artifact you list in artifacts_expected is a CONTRACT: Data Gathering is accountable "
        "for persisting all of them, and a Tier B audit hard-fails the run if any are missing. "
        "Name only artifacts that are actually required, and name every one that is.",
    ]
    scope = state.get("scope") or {}
    if scope:
        parts.append(f"Additional scope constraints: {json.dumps(scope, default=str)}")
    return "\n".join(parts)


# ---------------------------------------------------------------- Wave 1: Data Gathering

def make_data_gathering_node(ctx: NodeContext, emit=None):
    async def data_gathering(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "data_gathering", 1, "data_gathering")
        plan = state["plan"] or {}
        objective = state["question"] or _autonomous_directive(state)
        prompt = (
            f"run_id={state['run_id']}. Gather and persist every artifact needed for this plan:\n"
            f"{json.dumps(plan, default=str)}\n\n"
            f"{_context_blocks(state, 'DATA_GATHERING')}\n\nObjective: {objective}"
        )
        result = await ctx.call_agent("data_gathering", prompt,
                                      on_event=emit)  # thread_id intentionally omitted, see call_agent()

        # ARTIFACT_REGISTRY is the source of truth, NOT the agent's returned manifest. A run was
        # observed persisting 10 real artifacts while its manifest reported none, which emptied
        # state["artifacts"], starved wave 2 and produced a false "DATA GAP" executive report. The
        # manifest is still read, but only to enrich rows the registry already confirms exist.
        artifacts = await _registry_artifacts(ctx, state["run_id"], result.text)

        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 1, "node_name": ctx.agent_name("data_gathering"),
            "node_kind": "agent", "model_name": "claude-sonnet-4-5",
            "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "ts_end": time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_ms": result.duration_ms, "status": result.status,
            "artifacts_written": len(artifacts),
        })
        await ctx.node_finished(state, "data_gathering", 1, result.status, result.duration_ms,
                                "data_gathering", result.error,
                                {"artifacts_written": len(artifacts)})
        return {"artifacts": artifacts, "node_timings": {"data_gathering": result.duration_ms}}
    return data_gathering


async def _registry_artifacts(ctx: NodeContext, run_id: str, agent_text: str) -> list[ArtifactRef]:
    """Read what was ACTUALLY persisted, enriched where the agent's manifest agrees."""
    rows = await ctx.sql_exec(
        f"""SELECT ARTIFACT_NAME, GRAIN FROM {ctx.db}.{ctx.runtime_schema}.ARTIFACT_REGISTRY
            WHERE RUN_ID = %s ORDER BY ARTIFACT_NAME""",
        (run_id,),
    )
    manifest = {a.get("name"): a for a in (_json_block(agent_text) or {}).get("artifacts", [])
                if isinstance(a, dict) and a.get("name")}
    out: list[ArtifactRef] = []
    for r in rows:
        name = r.get("ARTIFACT_NAME")
        m = manifest.get(name, {})
        out.append(ArtifactRef(
            name=name,
            grain=m.get("grain") or r.get("GRAIN") or "",
            row_count=m.get("row_count", 0),
            columns=m.get("columns", []),
            summary=m.get("summary"),
            head_sample=m.get("head_sample"),
        ))
    return out


# ---------------------------------------------------------------- Wave 1 gate: Tier B artifact audit


class ArtifactContractBreach(RuntimeError):
    """Data Gathering did not deliver the artifacts the Master's plan specified.

    Fatal by design. Zero or partial artifacts is never a valid outcome: the accountable data plane
    produced nothing the downstream branches can honestly reason over. Previously the graph proceeded
    regardless, burned four parallel agents plus prescriptive on an empty evidence base, and let the
    report agent disguise the failure as a "DATA GAP" headline. Failing here surfaces the real defect
    and costs one wave instead of five.
    """


def make_artifact_gate_node(ctx: NodeContext):
    """Calls the Tier B audit and enforces its verdict.

    The RULE lives in RUN_TIER_B_ARTIFACT_AUDIT, in the validation layer alongside Tiers A/C/D, and it
    records a VALIDATION_EVENTS row like every other tier. This node only invokes it and acts on the
    verdict - the same division of responsibility validation_gate already has with TIER_D_GATE.
    """
    async def artifact_gate(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "artifact_gate", 1)
        rows = await ctx.sql_exec(
            f"CALL {ctx.db}.{ctx.schema}.RUN_TIER_B_ARTIFACT_AUDIT(%s, PARSE_JSON(%s))",
            (state["run_id"], json.dumps(state.get("plan") or {}, default=str)),
        )
        audit = json.loads(rows[0][list(rows[0].keys())[0]]) if rows else {}
        verdict = audit.get("verdict") or "CLEARED"
        missing = audit.get("missing") or []

        await ctx.node_finished(
            state, "artifact_gate", 1,
            "ok" if verdict == "CLEARED" else "error",
            int((time.time() - t0) * 1000),
            error=audit.get("reason") if verdict != "CLEARED" else None,
            detail={"verdict": verdict, "expected": audit.get("counts", {}).get("expected"),
                    "actual": audit.get("counts", {}).get("actual"), "missing": missing})

        if verdict != "CLEARED":
            raise ArtifactContractBreach(
                f"{audit.get('reason')} Missing: {', '.join(missing) or 'n/a'}")

        return {"artifact_audit": audit}
    return artifact_gate


# ---------------------------------------------------------------- Wave 2: parallel task agents

def make_route_to_wave2(ctx: NodeContext):
    """Build the fan-out dispatcher for the Send API.

    Interactive sends only to the agents the plan named, so a DATA_QUERY-route question does not
    pay for all four branches. Autonomous sends to every wave-2 agent unconditionally - the whole
    point of that module is a complete sweep, and letting a plan narrow it would make two
    executions of the same report cover different ground.
    """
    def route_to_wave2(state: RunState) -> list[Send]:
        eligible = list(ctx.module.wave2_agents)

        if not ctx.module.requires_question:
            return [Send(f"task_{k}", state) for k in eligible]

        # Master's "agents" field is not a fixed schema - it has been observed as either a flat
        # list of agent-name strings, or a richer list of dicts like {"agent": NAME, "wave": N}.
        # Both shapes must be tolerated since it is the same field being read either way.
        plan = state.get("plan") or {}
        raw_agents = plan.get("agents", []) or []
        names = [a.get("agent", "") if isinstance(a, dict) else str(a) for a in raw_agents]
        requested = {n.lower() for n in names if n}
        active = [k for k in eligible
                  if ctx.agent_name(k).lower() in requested or any(k in n for n in requested)]
        if not active:
            active = eligible  # full_analysis / unrecognised plan -> run everything
        return [Send(f"task_{k}", state) for k in active]
    return route_to_wave2


def make_task_agent_node(ctx: NodeContext, agent_key: str, emit=None):
    node_name = f"task_{agent_key}"

    async def task_agent(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, node_name, 2, agent_key)
        objective = state["question"] or _autonomous_directive(state)
        prompt = (
            f"run_id={state['run_id']}. You have NO database access. Use LIST_ARTIFACTS and "
            f"GET_SLICE to read what DATA_GATHERING already persisted.\n"
            # agent_key doubles as the CANONICAL_DATA_FACTS scope tag (TREND, DIMENSIONAL, ROOT_CAUSE,
            # PREDICTIVE, PRESCRIPTIVE), so each branch receives only the facts that apply to it.
            f"{_context_blocks(state, agent_key)}\n\nAnswer: {objective}"
        )
        result = await ctx.call_agent(agent_key, prompt,
                                      on_event=emit)  # thread_id intentionally omitted, see call_agent()
        parsed = _json_block(result.text) or {}
        finding = TaskFinding(
            node_name=ctx.agent_name(agent_key),
            status=result.status if result.status != "ok" else "ok",
            duration_ms=result.duration_ms,
            claims=[Claim(**c) for c in parsed.get("claims", []) if "metric" in c and "value" in c],
            citations=parsed.get("citations", []),
            driver_sum_gap_pp=parsed.get("driver_sum_gap_pp"),
            max_vif=parsed.get("max_vif"),
            collinearity_disclosed=parsed.get("collinearity_disclosed"),
            narrative_fragment=result.text,
            chart_spec=parsed.get("chart_spec"),
            error=result.error,
        )
        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 2, "node_name": ctx.agent_name(agent_key),
            "node_kind": "agent",
            "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "ts_end": time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_ms": result.duration_ms, "status": result.status,
        })
        # Tier C fires inline, right after this branch's own output - not after the whole wave.
        # Bound parameters: the payload is agent-generated JSON and will contain escapes.
        if parsed:
            await ctx.sql_exec(
                f"CALL {ctx.db}.{ctx.schema}.RUN_TIER_C_CHECK(%s, %s, PARSE_JSON(%s))",
                (state["run_id"], ctx.agent_name(agent_key), json.dumps(parsed)),
            )
        await ctx.node_finished(state, node_name, 2, result.status, result.duration_ms,
                                agent_key, result.error,
                                {"claims": len(finding["claims"])})
        return {"findings": [finding], "node_timings": {node_name: result.duration_ms}}
    return task_agent


# ---------------------------------------------------------------- Wave 2b: Prescriptive (conditional)

def make_needs_prescriptive(ctx: NodeContext):
    """Autonomous always runs Prescriptive - an exec report without recommended actions is not the
    deliverable. Interactive keeps the plan-driven condition."""
    def needs_prescriptive(state: RunState) -> str:
        if not ctx.module.requires_question:
            return "prescriptive"
        plan = state.get("plan") or {}
        route = plan.get("route", "")
        if route in ("predictive", "full_analysis") \
                or "PRESCRIPTIVE" in str(plan.get("agents", [])).upper():
            return "prescriptive"
        return "validation_gate"
    return needs_prescriptive


def make_prescriptive_node(ctx: NodeContext, emit=None):
    async def prescriptive(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "prescriptive", 2, "prescriptive")
        # cross-branch consumption: Prescriptive gets Root Cause's and Predictive's findings,
        # not just Predictive's - this is the note-A correction from Stage 1 planning.
        upstream = [f for f in state.get("findings", [])
                    if f["node_name"] in (ctx.agent_name("root_cause"),
                                          ctx.agent_name("predictive"))]
        objective = state["question"] or _autonomous_directive(state)
        prompt = (
            f"run_id={state['run_id']}. Upstream findings to build on:\n"
            f"{json.dumps(upstream, default=str)[:6000]}\n\nObjective: {objective}"
        )
        result = await ctx.call_agent("prescriptive", prompt,
                                      on_event=emit)  # thread_id intentionally omitted, see call_agent()
        parsed = _json_block(result.text) or {}
        finding = TaskFinding(
            node_name=ctx.agent_name("prescriptive"), status=result.status,
            duration_ms=result.duration_ms,
            claims=[Claim(**c) for c in parsed.get("claims", []) if "metric" in c and "value" in c],
            citations=parsed.get("citations", []), narrative_fragment=result.text,
            error=result.error,
        )
        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 2, "node_name": ctx.agent_name("prescriptive"),
            "node_kind": "agent", "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "duration_ms": result.duration_ms, "status": result.status,
        })
        await ctx.node_finished(state, "prescriptive", 2, result.status, result.duration_ms,
                                "prescriptive", result.error)
        return {"findings": [finding], "prescriptive": finding,
                "node_timings": {"prescriptive": result.duration_ms}}
    return prescriptive


# ---------------------------------------------------------------- Wave 3: Validation (Tier D)

def make_validation_gate_node(ctx: NodeContext):
    async def validation_gate(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "validation_gate", 3)
        rows = await ctx.sql_exec(
            f"CALL {ctx.db}.{ctx.schema}.TIER_D_GATE(%s)", (state["run_id"],))
        raw = json.loads(rows[0][list(rows[0].keys())[0]]) if rows else {}

        # Normalise the proc's payload onto the ValidationVerdict contract. TIER_D_GATE historically
        # returned only "final_verdict", which route_after_validation never read - so a BLOCKED run
        # silently routed to present. Accepting both names means a future change to either side
        # degrades to a wrong-but-visible verdict rather than a silently ignored one.
        verdict = {
            "verdict": raw.get("verdict") or raw.get("final_verdict") or "CLEARED",
            "retry_nodes": raw.get("retry_nodes") or [],
            "max_attempts": raw.get("max_attempts", 1),
            "caveats": raw.get("caveats") or [],
            "counts": raw.get("counts") or {},
        }
        await ctx.node_finished(state, "validation_gate", 3, "ok",
                                int((time.time() - t0) * 1000),
                                detail={"verdict": verdict["verdict"],
                                        "caveats": len(verdict["caveats"])})
        return {"validation": verdict}
    return validation_gate


def make_route_after_validation(ctx: NodeContext):
    """Interactive may take one corrective pass. Autonomous does not: a retry loop on an unattended
    sweep can silently double cost with nobody watching, so a BLOCKED verdict is carried through as
    a caveat on the report instead of re-running the data plane."""
    def route_after_validation(state: RunState) -> str:
        if not ctx.module.allow_retry:
            return "present"
        v = state.get("validation") or {}
        if v.get("verdict") == "BLOCKED" \
                and state.get("attempt_no", 1) < v.get("max_attempts", 1) + 1:
            return "retry"
        return "present"
    return route_after_validation


# ---------------------------------------------------------------- Wave 4/5: presentation

def make_narration_node(ctx: NodeContext, emit=None):
    async def narration(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "narration", 5, "narration")
        findings = state.get("findings", [])
        verdict = state.get("validation") or {}
        prompt = (
            f"run_id={state['run_id']}. Compose the final answer for: {state['question']}\n"
            f"{_context_blocks(state, 'NARRATION')}\n"
            f"Findings: {json.dumps(findings, default=str)[:8000]}\n"
            f"Validation caveats to disclose: {verdict.get('caveats', [])}"
        )
        result = await ctx.call_agent("narration", prompt,
                                      on_event=emit)  # thread_id intentionally omitted, see call_agent()
        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 5, "node_name": ctx.agent_name("narration"),
            "node_kind": "agent", "model_name": "claude-opus-4-6",
            "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "duration_ms": result.duration_ms, "status": result.status,
        })
        await ctx.node_finished(state, "narration", 5, result.status, result.duration_ms,
                                "narration", result.error)
        return {"narrative": result.text, "node_timings": {"narration": result.duration_ms}}
    return narration


def make_exec_report_node(ctx: NodeContext, emit=None):
    """Terminal node for the autonomous module.

    The report SCHEMA is owned by the agent, not by this prompt. EXEC_REPORT_AGENT_AUTO_DEMANDSENSING
    declares a detailed envelope in its own spec - enterprise_summary, per-section department /
    anomalies / drivers / trajectory, pending_approvals, validation_summary. An earlier version of
    this node restated a simpler shape here, which fought the agent's own contract and silently
    flattened away most of it. The orchestrator's only structural requirement is the outer
    {"report": {...}} envelope, because that is what gets persisted and what the UI reads; everything
    inside it is the agent's business and can evolve without touching the graph.
    """
    async def exec_report(state: RunState) -> dict:
        t0 = time.time()
        await ctx.node_started(state, "exec_report", 5, "exec_report")
        findings = state.get("findings", [])
        verdict = state.get("validation") or {}
        personas = state.get("personas") or []
        scope = state.get("scope") or {}
        prompt = (
            f"run_id={state['run_id']}. Compose the final EXECUTIVE REPORT for the autonomous sweep.\n"
            # NARRATION is the correct fact scope for the terminal report node: exec_report replaced
            # Insights Narration in the autonomous network, and the facts scoped to NARRATION are the
            # presentation-layer limitations that a report must disclose.
            f"{_context_blocks(state, 'NARRATION')}\n"
            f"Scope: {json.dumps(scope, default=str) if scope else 'enterprise-wide'}\n"
            f"Upstream findings: {json.dumps(findings, default=str)[:8000]}\n"
            f"Validation verdict: {verdict.get('verdict') or 'UNKNOWN'}\n"
            f"Validation caveats that MUST be disclosed: {verdict.get('caveats', [])}\n\n"
            "Return the JSON report envelope exactly as defined by your own OUTPUT FORMAT contract, "
            'wrapped as {"report": {...}}. Return only that JSON.'
        )
        result = await ctx.call_agent("exec_report", prompt,
                                      on_event=emit)  # thread_id intentionally omitted, see call_agent()
        parsed = _json_block(result.text) or {}
        # Tolerate the agent returning either {"report": {...}} or a bare report object.
        report = parsed.get("report") if isinstance(parsed.get("report"), dict) else (parsed or None)

        sections = (report or {}).get("sections") or []
        await ctx.log_node_event({
            "run_id": state["run_id"], "wave_no": 5, "node_name": ctx.agent_name("exec_report"),
            "node_kind": "agent",
            "ts_start": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t0)),
            "ts_end": time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_ms": result.duration_ms, "status": result.status,
        })
        await ctx.node_finished(state, "exec_report", 5, result.status, result.duration_ms,
                                "exec_report", result.error,
                                {"sections": len(sections)})
        return {
            "exec_report": report,
            # Kept populated as well so a single UI code path can render either module's prose.
            "narrative": result.text,
            "node_timings": {"exec_report": result.duration_ms},
        }
    return exec_report

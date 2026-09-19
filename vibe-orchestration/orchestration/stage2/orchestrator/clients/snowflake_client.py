# Snowflake Cortex Agents REST client - streaming, confirmed against a live account.
# Co-authored with CoCo
"""
Endpoint and event shapes below are NOT guessed from docs - they were captured from a live SSE
run against MASTER_ORCHESTRATOR_DEMANDSENSING in this account. Confirmed event types:

    response.status          {message, sequence_number, status}
    response.tool_use         {name, tool_use_id, input, type, content_index, ...}
    response.tool_result.status  {message, sequence_number, status, tool_use_id, tool_type}
    response.tool_result      {content: [...]}
    response.thinking.delta   {content_index, sequence_number, text}
    response.thinking         {content_index, sequence_number, text}  (aggregated)
    response.text.delta       {content_index, sequence_number, text}
    response.text             {content_index, sequence_number, text}  (aggregated)
    response.suggested_queries {content_index, suggested_queries: [...]}
    response                  {content: [...]}  (final full aggregate)
    done                      "[DONE]"

Auth: pluggable. In this sandbox, the Snowsight session OAuth token
(/snowflake/session/token) authenticates directly as a Bearer token - confirmed live.
In production on SPCS, swap in key-pair JWT (see JWTAuth below); the request/response
shape is identical either way.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import AsyncIterator, Callable

import httpx


# ---------------------------------------------------------------- auth

class SessionTokenAuth:
    """Reads the Snowflake-mounted OAuth session token.

    Used in two places, unchanged: the Snowsight sandbox mounts this token for the interactive
    session, and SPCS mounts an equivalent token that authenticates as the service user. Because
    SPCS rotates the file every few minutes, the token is re-read on every call rather than
    cached - a long orchestration run would otherwise start sending an expired bearer token
    partway through.
    """

    def __init__(self, token_path: str | None = None):
        self.token_path = token_path or os.environ.get(
            "SNOWFLAKE_TOKEN_FILE_PATH", "/snowflake/session/token")

    def bearer_token(self) -> str:
        with open(self.token_path) as fh:
            return fh.read().strip()


class JWTAuth:
    """Key-pair JWT auth for production SPCS deployment.

    Per the Stage 1/2 planning decision: SPCS services authenticate to Snowflake without
    long-lived credentials via /snowflake/session/token when running INSIDE Snowflake compute.
    This class is for the case where the orchestrator runs OUTSIDE Snowflake (e.g. a BFF) and
    must mint its own JWT from an account key pair.
    """

    def __init__(self, account: str, user: str, private_key_path: str, lifetime_s: int = 3600):
        self.account = account
        self.user = user
        self.private_key_path = private_key_path
        self.lifetime_s = lifetime_s
        self._cached: tuple[str, float] | None = None

    def bearer_token(self) -> str:
        if self._cached and time.time() < self._cached[1] - 30:
            return self._cached[0]
        token = self._mint_jwt()
        self._cached = (token, time.time() + self.lifetime_s)
        return token

    def _mint_jwt(self) -> str:
        import hashlib
        import jwt
        from cryptography.hazmat.primitives import serialization

        with open(self.private_key_path, "rb") as fh:
            pkey = serialization.load_pem_private_key(fh.read(), password=None)
        pub = pkey.public_key().public_bytes(
            serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        fp = "SHA256:" + hashlib.sha256(pub).hexdigest()
        qualified_user = f"{self.account.upper()}.{self.user.upper()}"
        now = int(time.time())
        payload = {
            "iss": f"{qualified_user}.{fp}",
            "sub": qualified_user,
            "iat": now,
            "exp": now + self.lifetime_s,
        }
        return jwt.encode(payload, pkey, algorithm="RS256")


# ---------------------------------------------------------------- event model

@dataclass
class AgentEvent:
    event: str
    data: dict
    ts: float = field(default_factory=time.time)


@dataclass
class AgentRunResult:
    text: str
    thinking: str
    tool_uses: list[dict]
    suggested_queries: list[dict]
    events: list[AgentEvent]
    duration_ms: int
    status: str = "ok"
    error: str | None = None


# ---------------------------------------------------------------- client

class CortexAgentClient:
    """Streaming client for POST /api/v2/databases/{db}/schemas/{schema}/agents/{name}:run."""

    def __init__(self, account_host: str, auth, timeout_s: float = 180.0):
        self.account_host = account_host
        self.auth = auth
        self.timeout_s = timeout_s

    def _url(self, db: str, schema: str, agent: str) -> str:
        return f"https://{self.account_host}/api/v2/databases/{db}/schemas/{schema}/agents/{agent}:run"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.auth.bearer_token()}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

    @staticmethod
    def _body(prompt: str, thread_id: str | None = None,
              parent_message_id: str | None = None) -> dict:
        body = {"messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]}
        if thread_id:
            body["thread_id"] = thread_id
        if parent_message_id:
            body["parent_message_id"] = parent_message_id
        return body

    async def stream(
        self, db: str, schema: str, agent: str, prompt: str, *,
        thread_id: str | None = None,
        on_event: Callable[[AgentEvent], None] | None = None,
    ) -> AsyncIterator[AgentEvent]:
        """Async-iterate raw SSE events as they arrive. Caller assembles final state, or use run()."""
        url = self._url(db, schema, agent)
        body = self._body(prompt, thread_id)
        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            async with client.stream("POST", url, json=body, headers=self._headers()) as resp:
                resp.raise_for_status()
                ev_name = None
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("event:"):
                        ev_name = line[6:].strip()
                    elif line.startswith("data:"):
                        raw = line[5:].strip()
                        if raw == "[DONE]":
                            event = AgentEvent(event="done", data={})
                        else:
                            try:
                                event = AgentEvent(event=ev_name or "unknown", data=json.loads(raw))
                            except json.JSONDecodeError:
                                event = AgentEvent(event=ev_name or "unknown", data={"raw": raw})
                        if on_event:
                            on_event(event)
                        yield event

    async def run(
        self, db: str, schema: str, agent: str, prompt: str, *,
        thread_id: str | None = None,
        on_event: Callable[[AgentEvent], None] | None = None,
    ) -> AgentRunResult:
        """Consume the full stream and return the assembled result. Raises on transport error;
        captures agent-side errors in AgentRunResult.status/error instead of raising, so a wave
        of parallel calls can degrade gracefully rather than aborting the whole run."""
        t0 = time.time()
        text_parts, thinking_parts, tool_uses, suggested = [], [], [], []
        events: list[AgentEvent] = []
        status, error = "ok", None
        try:
            async for ev in self.stream(db, schema, agent, prompt,
                                        thread_id=thread_id, on_event=on_event):
                events.append(ev)
                if ev.event == "response.text.delta":
                    text_parts.append(ev.data.get("text", ""))
                elif ev.event == "response.thinking.delta":
                    thinking_parts.append(ev.data.get("text", ""))
                elif ev.event == "response.tool_use":
                    tool_uses.append(ev.data)
                elif ev.event == "response.suggested_queries":
                    suggested = ev.data.get("suggested_queries", [])
                elif ev.event == "response.status" and ev.data.get("status") == "error":
                    status, error = "error", ev.data.get("message")
        except httpx.HTTPStatusError as e:
            # streamed responses must be read before .text/.content is accessible - accessing
            # it directly raises httpx.ResponseNotRead, which would otherwise mask the real error
            try:
                await e.response.aread()
                detail = e.response.text[:400]
            except Exception:
                detail = "<response body unavailable>"
            status, error = "error", f"HTTP {e.response.status_code}: {detail}"
        except Exception as e:
            status, error = "error", str(e)[:400]

        return AgentRunResult(
            text="".join(text_parts),
            thinking="".join(thinking_parts),
            tool_uses=tool_uses,
            suggested_queries=suggested,
            events=events,
            duration_ms=int((time.time() - t0) * 1000),
            status=status,
            error=error,
        )

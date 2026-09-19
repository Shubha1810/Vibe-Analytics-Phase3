# Centralised runtime configuration for the DemandSensing orchestrator - no hardcoded identities.
# Co-authored with CoCo
"""
Every value that used to be a module-level constant baked into the source now resolves from the
environment, with the previous literal kept only as a last-resort default so existing sandbox runs
behave identically.

This is what removes the single-user dependency. Inside SPCS, Snowflake itself populates
SNOWFLAKE_ACCOUNT and SNOWFLAKE_HOST and mounts an OAuth token at /snowflake/session/token that
authenticates as the SERVICE user under the service's owner role - not as whoever happened to
create the workspace. Nothing in this module reads a personal credential.

Role handling deserves a note: a service user has access to only its service owner role and
PUBLIC. Passing an explicit role the service user does not hold makes the connection fail, so
SNOWFLAKE_ROLE resolving to empty means "send no role and let the service user default to its
owner role" rather than "fall back to ACCOUNTADMIN".
"""
from __future__ import annotations

import os


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


# ---------------------------------------------------------------- Snowflake connection

def account() -> str:
    """Account locator. SPCS sets this automatically; the default is the dev sandbox account."""
    return _env("SNOWFLAKE_ACCOUNT", "wyb53653")


def host() -> str:
    """Hostname used for the SQL connection. SPCS sets this to an internal ingress host."""
    return _env("SNOWFLAKE_HOST", f"{account()}.snowflakecomputing.com")


def cortex_api_host() -> str:
    """Hostname used for the Cortex Agents REST API.

    Kept separate from host() deliberately. The SPCS-provided SNOWFLAKE_HOST is normally the
    correct target for /api/v2 calls too, but keeping an independent override means the REST path
    can be repointed at the account URL without rebuilding the image if the internal host ever
    refuses the Cortex endpoints.
    """
    return _env("CORTEX_API_HOST") or host()


def token_path() -> str:
    return _env("SNOWFLAKE_TOKEN_FILE_PATH", "/snowflake/session/token")


def warehouse() -> str:
    return _env("SNOWFLAKE_WAREHOUSE", "COCO_HOL_WH")


def role() -> str:
    """Empty string means: do not pass a role, let the service user use its owner role."""
    return _env("SNOWFLAKE_ROLE")


# ---------------------------------------------------------------- object namespace

def database() -> str:
    return _env("DEMANDSENSING_DB", "DEMANDSENSING_AI")


def schema() -> str:
    return _env("DEMANDSENSING_SCHEMA", "DEMANDSENSING_SCHEMA")


def runtime_schema() -> str:
    return _env("DEMANDSENSING_RUNTIME_SCHEMA", "DEMANDSENSING_RUNTIME")


def fqn(obj: str) -> str:
    """Fully-qualify an object name in the orchestrator's operational schema."""
    return f"{database()}.{schema()}.{obj}"


def runtime_fqn(obj: str) -> str:
    return f"{database()}.{runtime_schema()}.{obj}"


# ---------------------------------------------------------------- agent names

def agent_names(module: str | None = None) -> dict[str, str]:
    """Agent key -> Snowflake agent name for a module.

    Agent naming now belongs to the module registry, because there is more than one network and
    each needs its own map. This delegating wrapper is kept so existing callers that assume a
    single implicit network keep working; new code should read spec.agents from modules.get().
    """
    from . import modules
    return modules.get(module).agents


# ---------------------------------------------------------------- service behaviour

def results_table() -> str:
    return fqn(_env("ORCHESTRATION_RESULTS_TABLE", "ORCHESTRATION_RUNS"))


def events_table() -> str:
    """Node-level lifecycle events, one row per node transition.

    Separate from AGENT_RUN_METRICS on purpose. That table is post-hoc telemetry written by
    LOG_NODE_EVENT once a node has finished, and it carries cost/validation analytics. The
    autonomous module's live network visualisation needs a row the moment a node STARTS, so the UI
    can show a node as in-flight rather than only after it completes - a different write pattern
    and a different read pattern, so a different table.
    """
    return fqn(_env("ORCHESTRATION_EVENTS_TABLE", "ORCHESTRATION_RUN_EVENTS"))


def agent_timeout_s() -> float:
    return float(_env("AGENT_TIMEOUT_S", "600"))


def max_concurrent_runs() -> int:
    return int(_env("MAX_CONCURRENT_RUNS", "4"))


def server_port() -> int:
    return int(_env("SERVER_PORT", "8080"))

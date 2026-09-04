"""
Vibe Analytics — Demand Sensing: Flask API Backend (Minimal Auth)
Handles OAuth PKCE flow for Snowflake authentication.
"""
import os
import re
import threading
import socket
import webbrowser
import secrets as _secrets
import hashlib as _hashlib
import base64 as _base64
from urllib.parse import urlencode as _urlencode

import requests as http_requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import snowflake.connector

load_dotenv()

# Configure Snowflake callback port
os.environ["SF_AUTH_SOCKET_PORT"] = os.getenv("SF_AUTH_SOCKET_PORT", "8888")
os.environ["SNOWFLAKE_AUTH_SOCKET_REUSE_PORT"] = "true"

# Intercept webbrowser to capture OAuth URLs in headless environments
_auth_url = None
_auth_lock = threading.Lock()


def _mock_webbrowser_open(url, *args, **kwargs):
    global _auth_url
    print(f"\n[SNOWFLAKE AUTH] Intercepted Login URL: {url}\n")
    with _auth_lock:
        _auth_url = url
    return True


webbrowser.open = _mock_webbrowser_open
webbrowser.open_new = _mock_webbrowser_open
webbrowser.open_new_tab = _mock_webbrowser_open


# Patch Snowflake's Origin validator for Docker environments
def _patch_origin_validators():
    candidates = []
    try:
        from snowflake.connector.auth import oauth_code as _oc
        candidates.append(_oc)
    except Exception:
        pass
    try:
        from snowflake.connector.auth import webbrowser as _wb
        candidates.append(_wb)
    except Exception:
        pass
    try:
        from snowflake.connector import connection as _cn
        candidates.append(_cn)
    except Exception:
        pass
    for mod in candidates:
        for cls_name in ("AuthByOauthCode", "AuthByWebBrowser"):
            cls = getattr(mod, cls_name, None)
            if cls and hasattr(cls, "_validate_origin"):
                cls._validate_origin = lambda *a, **kw: True
                print(f"[Snowflake] Patched {cls_name}._validate_origin in {mod.__name__}")


_patch_origin_validators()


# Patch AuthHttpServer timeout to 600s for interactive login
def _patch_auth_http_server():
    try:
        from snowflake.connector.auth import _http_server as _hs
    except Exception:
        return
    AuthHttpServer = getattr(_hs, "AuthHttpServer", None)
    if AuthHttpServer is None:
        return
    if getattr(AuthHttpServer, "_vibe_patched", False):
        return
    AuthHttpServer.DEFAULT_TIMEOUT = 600.0
    AuthHttpServer._vibe_patched = True
    print(f"[Snowflake] Set AuthHttpServer.DEFAULT_TIMEOUT = 600s")


_patch_auth_http_server()

# ── Flask App ──────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# Load .env from parent directories
try:
    for env_file in [".env", "../.env", "../../.env"]:
        if os.path.exists(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        parts = line.split("=", 1)
                        if len(parts) == 2:
                            k, v = parts[0].strip(), parts[1].strip()
                            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                                v = v[1:-1]
                            os.environ[k] = v
except Exception:
    pass

# ── Snowflake Config ───────────────────────────────────────────────────────────
SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "")
SNOWFLAKE_HOST = os.getenv("SNOWFLAKE_HOST", "")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER", "")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "COCO_HOL_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "DEMANDSENSING_AI")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE", "ACCOUNTADMIN")

_conn = None
_auth_status = {"connected": False, "error": None}

# OAuth PKCE flow state
_oauth_flow = {
    "state": None,
    "code_verifier": None,
    "redirect_uri": None,
    "auth_url": None,
    "access_token": None,
    "in_progress": False,
}
_oauth_lock = threading.Lock()


def _build_oauth_redirect_uri():
    full_uri = os.getenv("SNOWFLAKE_OAUTH_REDIRECT_URI", "").strip()
    if full_uri:
        return full_uri
    backend_port = os.getenv("SNOWFLAKE_OAUTH_REDIRECT_PORT") or os.getenv("BACKEND_PORT") or "5001"
    return f"http://127.0.0.1:{backend_port}"


def _start_manual_oauth_flow():
    state = _secrets.token_urlsafe(43)
    verifier = _secrets.token_urlsafe(43)
    challenge = (
        _base64.urlsafe_b64encode(_hashlib.sha256(verifier.encode("utf-8")).digest())
        .decode("utf-8")
        .rstrip("=")
    )
    redirect_uri = _build_oauth_redirect_uri()
    params = {
        "response_type": "code",
        "client_id": "LOCAL_APPLICATION",
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": f"session:role:{SNOWFLAKE_ROLE}",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"https://{SNOWFLAKE_HOST}/oauth/authorize?{_urlencode(params)}"

    with _oauth_lock:
        _oauth_flow["state"] = state
        _oauth_flow["code_verifier"] = verifier
        _oauth_flow["redirect_uri"] = redirect_uri
        _oauth_flow["auth_url"] = auth_url
        _oauth_flow["access_token"] = None
        _oauth_flow["in_progress"] = True

    global _auth_url
    with _auth_lock:
        _auth_url = auth_url

    print(f"[Snowflake] Generated OAuth URL with redirect_uri={redirect_uri}")
    return auth_url


def _exchange_code_for_token(code):
    with _oauth_lock:
        verifier = _oauth_flow["code_verifier"]
        redirect_uri = _oauth_flow["redirect_uri"]
    if not verifier or not redirect_uri:
        raise RuntimeError("OAuth flow state missing - restart sign in")

    token_url = f"https://{SNOWFLAKE_HOST}/oauth/token-request"
    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "code_verifier": verifier,
    }
    resp = http_requests.post(
        token_url,
        data=body,
        auth=("LOCAL_APPLICATION", "LOCAL_APPLICATION"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Token exchange failed: HTTP {resp.status_code} - {resp.text[:500]}")
    payload = resp.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise RuntimeError(f"Token response missing access_token: {payload}")
    return access_token


def _get_spcs_token():
    try:
        with open("/snowflake/session/token", "r") as f:
            return f.read().strip()
    except Exception:
        return None


def get_connection():
    global _conn, _auth_status
    spcs_token = _get_spcs_token()
    env_token = os.getenv("SNOWFLAKE_TOKEN", "")
    with _oauth_lock:
        oauth_token = _oauth_flow.get("access_token")

    if _conn is not None:
        try:
            _conn.cursor().execute("SELECT 1")
            return _conn
        except Exception:
            _conn = None

    if spcs_token:
        _conn = snowflake.connector.connect(
            host=SNOWFLAKE_HOST,
            account=SNOWFLAKE_ACCOUNT,
            token=spcs_token,
            authenticator="oauth",
            warehouse=SNOWFLAKE_WAREHOUSE,
            database=SNOWFLAKE_DATABASE,
            role=SNOWFLAKE_ROLE,
        )
    elif env_token:
        _conn = snowflake.connector.connect(
            account=SNOWFLAKE_ACCOUNT,
            user=SNOWFLAKE_USER,
            authenticator="programmatic_access_token",
            token=env_token,
            warehouse=SNOWFLAKE_WAREHOUSE,
            database=SNOWFLAKE_DATABASE,
            role=SNOWFLAKE_ROLE,
        )
    elif oauth_token:
        _conn = snowflake.connector.connect(
            account=SNOWFLAKE_ACCOUNT,
            user=SNOWFLAKE_USER,
            authenticator="oauth",
            token=oauth_token,
            warehouse=SNOWFLAKE_WAREHOUSE,
            database=SNOWFLAKE_DATABASE,
            role=SNOWFLAKE_ROLE,
        )
    else:
        raise RuntimeError(
            "No Snowflake credentials available. Complete the interactive "
            "OAuth sign-in (the frontend will show a Sign in with Snowflake button)."
        )
    _auth_status = {"connected": True, "error": None}
    return _conn


def _startup_auth():
    global _auth_status, _auth_url

    spcs_token = _get_spcs_token()
    env_token = os.getenv("SNOWFLAKE_TOKEN", "")

    if spcs_token or env_token:
        def _connect_bg():
            global _auth_status
            try:
                print("\n[Background] Connecting to Snowflake via stored token...")
                get_connection()
                print("[Background] Connected to Snowflake successfully!\n")
            except Exception as e:
                _auth_status = {"connected": False, "error": str(e)}
                print(f"[Background] Connection startup issue: {e}")

        threading.Thread(target=_connect_bg, daemon=True).start()
        return

    try:
        url = _start_manual_oauth_flow()
        print(f"[Snowflake] Awaiting interactive OAuth callback at {_oauth_flow['redirect_uri']}")
    except Exception as e:
        _auth_status = {"connected": False, "error": f"Failed to build OAuth URL: {e}"}
        print(f"[Snowflake] Failed to build OAuth URL: {e}")


# ── API Routes ─────────────────────────────────────────────────────────────────

_auth_initialized = False


@app.route("/api/auth")
def api_auth():
    global _auth_status, _auth_url, _auth_initialized

    if _auth_status.get("connected"):
        return jsonify({"status": "connected", "account": SNOWFLAKE_ACCOUNT, "user": SNOWFLAKE_USER})

    if not _auth_initialized:
        _auth_initialized = True
        _startup_auth()
        return jsonify({"status": "initializing", "message": "Starting backend connection..."})

    if _auth_status.get("error"):
        with _auth_lock:
            _auth_url = None
        return jsonify({
            "status": "auth_error",
            "error": _auth_status.get("error"),
            "message": "Snowflake login timed out. Please retry sign-in.",
        })

    with _auth_lock:
        captured_url = _auth_url

    if captured_url:
        return jsonify({
            "status": "needs_auth",
            "auth_url": captured_url,
            "account": SNOWFLAKE_ACCOUNT,
            "user": SNOWFLAKE_USER,
        })

    return jsonify({"status": "initializing", "message": "Connecting in background..."})


@app.route("/api/auth/restart", methods=["POST"])
def api_auth_restart():
    global _conn, _auth_status, _auth_url, _auth_initialized
    _conn = None
    _auth_status = {"connected": False, "error": None}
    with _oauth_lock:
        _oauth_flow["state"] = None
        _oauth_flow["code_verifier"] = None
        _oauth_flow["redirect_uri"] = None
        _oauth_flow["auth_url"] = None
        _oauth_flow["access_token"] = None
        _oauth_flow["in_progress"] = False
    with _auth_lock:
        _auth_url = None
    _auth_initialized = True
    _startup_auth()
    return jsonify({"status": "initializing", "message": "Re-triggering Snowflake connection..."})


def _handle_oauth_callback():
    global _auth_status, _conn

    code = request.args.get("code")
    state = request.args.get("state")
    error_param = request.args.get("error")
    error_desc = request.args.get("error_description")

    if error_param:
        message = error_desc or error_param
        _auth_status = {"connected": False, "error": f"Snowflake returned: {message}"}
        return _oauth_callback_html(False, f"Snowflake declined the login: {message}")

    if not code or not state:
        _auth_status = {"connected": False, "error": "OAuth callback missing code/state"}
        return _oauth_callback_html(False, "OAuth callback was missing code or state.")

    with _oauth_lock:
        expected_state = _oauth_flow.get("state")

    if state != expected_state:
        _auth_status = {"connected": False, "error": "OAuth state mismatch - retry sign-in"}
        return _oauth_callback_html(False, "OAuth state did not match. Please retry sign-in.")

    try:
        token = _exchange_code_for_token(code)
    except Exception as e:
        _auth_status = {"connected": False, "error": str(e)}
        print(f"[Snowflake] Token exchange failed: {e}")
        return _oauth_callback_html(False, f"Token exchange failed: {e}")

    with _oauth_lock:
        _oauth_flow["access_token"] = token
        _oauth_flow["in_progress"] = False

    _conn = None
    try:
        get_connection()
        print("[Snowflake] OAuth flow completed - connection established")
    except Exception as e:
        _auth_status = {"connected": False, "error": str(e)}
        print(f"[Snowflake] Failed to build connection from token: {e}")
        return _oauth_callback_html(False, f"Connection failed after sign-in: {e}")

    return _oauth_callback_html(True, "Returning you to Vibe Analytics...")


@app.route("/")
def api_root():
    if request.args.get("code") or request.args.get("state") or request.args.get("error"):
        return _handle_oauth_callback()
    return Response(
        "<!DOCTYPE html><html><head><title>Vibe Analytics Backend</title></head>"
        "<body style=\"font-family:system-ui,sans-serif;padding:24px;color:#0f172a\">"
        "<h2>Vibe Analytics — Demand Sensing Backend</h2>"
        "<p>This port serves the API and the Snowflake OAuth callback. "
        "Use the frontend (<code>http://localhost:3000</code>) for the UI.</p>"
        "</body></html>",
        mimetype="text/html",
    )


@app.route("/api/oauth/callback")
def api_oauth_callback():
    return _handle_oauth_callback()


def _oauth_callback_html(success, detail):
    title = "Login successful" if success else "Login failed"
    title_suffix = "Complete" if success else "Failed"
    color = "#0f172a" if success else "#b91c1c"
    js_status = "connected" if success else "error"
    safe_detail = (detail or "").replace("<", "&lt;").replace(">", "&gt;")
    html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Snowflake Login {title_suffix}</title>
    <style>
      body{{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}
      .card{{background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.08);text-align:center;max-width:420px}}
      h2{{margin:0 0 8px;font-size:18px;color:{color}}} p{{margin:0;color:#64748b;font-size:14px;line-height:1.5}}
    </style>
  </head>
  <body>
    <div class="card">
      <h2>{title}</h2>
      <p>{safe_detail}</p>
    </div>
    <script>
      try {{
        if (window.opener && !window.opener.closed) {{
          window.opener.postMessage({{source:'sf-auth',status:'{js_status}'}}, '*');
        }}
      }} catch (e) {{}}
      setTimeout(function() {{ try {{ window.close(); }} catch (e) {{}} }}, 400);
    </script>
  </body>
</html>"""
    return Response(html, mimetype="text/html")


# ── Placeholder endpoints (return empty/stub so frontend doesn't 404) ──────────

@app.route("/api/kpis")
def api_kpis():
    return jsonify([])


def _convert_plotly_to_d3_spec(plotly_data, columns_used, title, chart_type):
    """Convert Plotly JSON from PLOTLY_DEMANDSENSING into a D3-compatible spec.

    Extracts data from Plotly traces and builds a spec that D3Chart can render.
    Preserves the chart_type the agent chose (bar, stacked_bar, line, etc.).
    """
    try:
        traces = plotly_data.get("data", [])
        if not traces:
            return None

        import base64
        import struct

        def decode_y(y_data):
            if isinstance(y_data, dict) and "bdata" in y_data:
                bdata = base64.b64decode(y_data["bdata"])
                return list(struct.unpack(f'<{len(bdata)//8}d', bdata))
            elif isinstance(y_data, list):
                return [float(v) if v is not None else 0 for v in y_data]
            return []

        # Flatten traces into rows: each trace is a series (color group)
        rows = []
        x_field = (columns_used.get("x") or "CATEGORY").upper()
        y_field = (columns_used.get("y") or "VALUE").upper()
        color_field = (columns_used.get("color") or "SERIES").upper()

        for trace in traces:
            series_name = trace.get("name", "Unknown")
            x_values = trace.get("x", [])
            y_values = decode_y(trace.get("y", []))
            for i, x_val in enumerate(x_values):
                y_val = y_values[i] if i < len(y_values) else 0
                rows.append({
                    x_field: str(x_val),
                    y_field: round(y_val, 2),
                    color_field: series_name,
                })

        if not rows:
            return None

        # Map chart_type to D3 mark type
        mark_map = {
            "stacked_bar": "bar",
            "grouped_bar": "bar",
            "bar": "bar",
            "line": "line",
            "scatter": "point",
            "area": "area",
        }
        mark = mark_map.get(chart_type, "bar")

        # Build spec
        spec = {
            "mark": mark,
            "title": title or "",
            "data": {"values": rows},
            "encoding": {
                "x": {"field": x_field, "type": "nominal"},
                "y": {"field": y_field, "type": "quantitative"},
                "color": {"field": color_field, "type": "nominal"},
            },
        }

        # For stacked bars, add stack indicator
        if chart_type == "stacked_bar":
            spec["encoding"]["y"]["stack"] = "zero"

        return spec
    except Exception as e:
        print(f"[Plotly→D3 Conversion Error] {e}")
        return None


@app.route("/api/agent/query", methods=["POST"])
def api_agent_query():
    """
    Interactive agent query endpoint.
    Calls Snowflake Cortex Agent REST API for INTERACTIVE_DEMANDSENSING_AGENT.
    Expects: { question, context, persona, recent_kpis }
    Returns: { text, sql, result_set, plotly_json, suggested_queries, planning, error }
    """
    import json as _json

    try:
        conn = get_connection()
    except Exception as e:
        return jsonify({"error": f"Not connected to Snowflake: {str(e)}"}), 503

    body = request.get_json(force=True)
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400

    context = body.get("context", [])
    persona = body.get("persona", "")

    # Build conversation messages
    messages = []
    for msg in context[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if content:
            messages.append({"role": role, "content": [{"type": "text", "text": content}]})

    user_content = question
    if persona and not messages:
        user_content = f"[Persona: {persona}] {question}"

    # --- FEEDBACK RULES INJECTION ---
    # Query FEEDBACK_RULES for matching rules based on vector similarity to the user's question
    injected_rules = []
    try:
        rules_cur = conn.cursor()
        escaped_q = question.replace("'", "''")
        rules_cur.execute(f"""
            SELECT RULE_TEXT, RULE_CATEGORY, RULE_PRIORITY,
                   VECTOR_COSINE_SIMILARITY(QUERY_EMBEDDING, SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', '{escaped_q}')) AS SIM
            FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_RULES
            WHERE IS_ACTIVE = TRUE
            HAVING SIM >= 0.75
            ORDER BY SIM DESC
            LIMIT 5
        """)
        matched_rules = rules_cur.fetchall()
        rules_cur.close()

        for rule_row in matched_rules:
            rule_text = rule_row[0]
            rule_cat = rule_row[1]
            injected_rules.append(f"[{rule_cat.upper()}] {rule_text}")

        # Update hit counts for matched rules
        if matched_rules:
            hit_cur = conn.cursor()
            hit_cur.execute(f"""
                UPDATE DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_RULES
                SET HIT_COUNT = HIT_COUNT + 1, LAST_HIT_AT = CURRENT_TIMESTAMP()
                WHERE IS_ACTIVE = TRUE
                  AND VECTOR_COSINE_SIMILARITY(QUERY_EMBEDDING, SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', '{escaped_q}')) >= 0.75
            """)
            hit_cur.close()
    except Exception as rules_err:
        print(f"[Feedback Rules] Non-blocking error: {rules_err}")

    # If matching rules found, prepend them as system context to the user message
    if injected_rules:
        rules_block = "\n".join(injected_rules)
        user_content = f"[FEEDBACK IMPROVEMENT RULES - You MUST follow these]\n{rules_block}\n\n[USER QUESTION]\n{user_content}"
        print(f"[Feedback Rules] Injected {len(injected_rules)} rules into query")
    # --- END FEEDBACK RULES INJECTION ---

    messages.append({"role": "user", "content": [{"type": "text", "text": user_content}]})

    # Use Snowflake REST API for Cortex Agent
    # Use the connector's own authenticated REST client to make the request
    import json as _json2

    account = SNOWFLAKE_ACCOUNT
    host = SNOWFLAKE_HOST or f"{account}.snowflakecomputing.com"
    agent_api_url = f"https://{host}/api/v2/cortex/agent:run"

    # Build the agent run request payload — call DATA_AGENT_RUN with bind parameters
    agent_fqn = "DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.INTERACTIVE_DEMANDSENSING_AGENT"
    agent_body = _json.dumps({"messages": messages})

    try:
        cur = conn.cursor()
        cur.execute("ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = 600")

        sql_stmt = "SELECT SNOWFLAKE.CORTEX.DATA_AGENT_RUN(%s, %s) AS R"
        cur.execute(sql_stmt, (agent_fqn, agent_body))
        row = cur.fetchone()
        cur.close()

        if not row or row[0] is None:
            return jsonify({"error": "No response from agent"}), 500

        raw = row[0]
        if isinstance(raw, str):
            resp = _json.loads(raw)
        elif isinstance(raw, dict):
            resp = raw
        else:
            resp = _json.loads(str(raw))

        # DEBUG: Write raw response to file for inspection
        try:
            with open("response.txt", "w", encoding="utf-8") as f:
                f.write(_json.dumps(resp, indent=2, default=str))
            print(f"[Agent] Raw response written to response.txt ({len(str(resp))} chars)")
        except Exception:
            pass

        # Check if agent returned an error
        if "error_code" in resp or ("message" in resp and "content" not in resp):
            error_msg = resp.get("message", "Agent returned an error")
            return jsonify({"error": error_msg, "text": ""}), 200

        # Parse content items from the response
        text_parts = []
        sql_parts = []
        vega_spec = None
        plotly_fallback = None
        result_set = None
        suggested_queries = []
        tools_called = []
        classified_intent = None  # Will hold real classify_demand_sensing_intent result

        content_items = resp.get("content", [])

        # Find the index of the last tool_result — text after it is the final answer;
        # text before it is internal agent narration (e.g., "I'll start by classifying...")
        last_tool_result_idx = -1
        for idx, item in enumerate(content_items):
            if item.get("type") in ("tool_result", "tool_use"):
                last_tool_result_idx = idx

        for idx, item in enumerate(content_items):
            itype = item.get("type", "")

            if itype == "text":
                # Only include text that appears AFTER the last tool interaction
                if idx <= last_tool_result_idx:
                    continue
                txt = item.get("text", "")
                if txt.strip():
                    text_parts.append(txt.strip())

            elif itype == "chart":
                # Agent generated a Vega-Lite chart via data_to_chart
                chart_data = item.get("chart", {})
                chart_spec_str = chart_data.get("chart_spec", "")
                if chart_spec_str:
                    try:
                        vega_spec = _json.loads(chart_spec_str) if isinstance(chart_spec_str, str) else chart_spec_str
                    except (ValueError, TypeError):
                        vega_spec = None

            elif itype == "table":
                # Agent returned a structured table with result set
                table_data = item.get("table", {})
                rs = table_data.get("result_set", {})
                if rs:
                    columns = [col.get("name", "") for col in rs.get("resultSetMetaData", {}).get("rowType", [])]
                    rows = rs.get("data", [])
                    result_set = {
                        "columns": columns,
                        "rows": rows,
                    }

            elif itype == "suggested_queries":
                # Agent returned follow-up suggestions
                sq_list = item.get("suggested_queries", [])
                for sq in sq_list:
                    if isinstance(sq, dict) and sq.get("query"):
                        suggested_queries.append(sq["query"])
                    elif isinstance(sq, str):
                        suggested_queries.append(sq)

            elif itype == "tool_use":
                tool_data = item.get("tool_use", {})
                tool_name = tool_data.get("name", "")
                if tool_name:
                    tools_called.append({"name": tool_name})
                # Legacy: extract SQL from tool input
                tool_input = tool_data.get("input", {})
                if tool_input.get("query_sql"):
                    sql_parts.append(tool_input["query_sql"])

            elif itype == "mcp_tool_use":
                mcp_data = item.get("mcp_tool_use", item.get("tool_use", {}))
                mcp_tool_name = mcp_data.get("name", "")
                if mcp_tool_name:
                    tools_called.append({"name": f"MCP:{mcp_tool_name}"})

            elif itype == "tool_result":
                tool_result_data = item.get("tool_result", {})
                tool_name = tool_result_data.get("name", "")

                # Extract SQL and result_set from system_execute_sql results
                if tool_name == "system_execute_sql":
                    content_blocks = tool_result_data.get("content", [])
                    for block in content_blocks:
                        if isinstance(block, dict) and block.get("type") == "json":
                            json_data = block.get("json", {})
                            # Extract the executed SQL
                            if json_data.get("sql"):
                                sql_parts.append(json_data["sql"])
                            # Extract result set if we don't already have one from a table item
                            if not result_set and json_data.get("result_set"):
                                rs = json_data["result_set"]
                                columns = [col.get("name", "") for col in rs.get("resultSetMetaData", {}).get("rowType", [])]
                                rows = rs.get("data", [])
                                result_set = {
                                    "columns": columns,
                                    "rows": rows,
                                }

                # Extract classify_demand_sensing_intent result for real planning
                elif tool_name in ("classify_demand_sensing_intent", "classify_intent"):
                    content_blocks = tool_result_data.get("content", [])
                    for block in content_blocks:
                        if isinstance(block, dict) and block.get("type") == "json":
                            json_data = block.get("json", {})
                            result_str = json_data.get("result", "")
                            if result_str and isinstance(result_str, str):
                                try:
                                    classified_intent = _json.loads(result_str)
                                except (ValueError, TypeError):
                                    pass
                            elif isinstance(json_data, dict) and json_data.get("intent"):
                                classified_intent = json_data

                # Extract chart from data_to_chart tool results
                elif tool_name == "data_to_chart":
                    content_blocks = tool_result_data.get("content", [])
                    for block in content_blocks:
                        if isinstance(block, dict) and block.get("type") == "json":
                            json_data = block.get("json", {})
                            charts = json_data.get("charts", [])
                            if charts and not vega_spec:
                                try:
                                    vega_spec = _json.loads(charts[0]) if isinstance(charts[0], str) else charts[0]
                                except (ValueError, TypeError):
                                    pass

                # Handle PLOTLY_DEMANDSENSING tool results — pass plotly_json directly to frontend
                elif "plotly" in tool_name.lower() or "PLOTLY" in tool_name:
                    content_blocks = tool_result_data.get("content", [])
                    for block in content_blocks:
                        if isinstance(block, dict) and block.get("type") == "json":
                            json_data = block.get("json", {})
                            result_str = json_data.get("result", "")
                            if result_str and isinstance(result_str, str):
                                try:
                                    result_parsed = _json.loads(result_str)
                                    plotly_data = result_parsed.get("plotly_json")

                                    # Pass plotly figure directly — no D3 conversion
                                    if plotly_data:
                                        plotly_fallback = plotly_data

                                    # Also try D3 conversion as secondary path
                                    if plotly_data and not vega_spec:
                                        vega_spec = _convert_plotly_to_d3_spec(
                                            plotly_data, result_parsed.get("columns_used", {}),
                                            result_parsed.get("title", ""),
                                            result_parsed.get("chart_type", "bar")
                                        )

                                    if result_parsed.get("sql_used"):
                                        sql_parts.append(result_parsed["sql_used"])
                                except (ValueError, TypeError):
                                    pass

                # Legacy: handle other tool results
                else:
                    content_data = tool_result_data.get("content", "")
                    if isinstance(content_data, str):
                        try:
                            parsed = _json.loads(content_data)
                            if "plotly_json" in parsed:
                                plotly_fallback = parsed["plotly_json"]
                            if "sql_used" in parsed:
                                sql_parts.append(parsed["sql_used"])
                        except (ValueError, TypeError):
                            pass

        final_text = "\n\n".join(text_parts) if text_parts else "No response generated."

        # Post-process: Deduplicate repeated sections
        # The agent sometimes restarts its output after a tool result, producing
        # the same headings, tables, and paragraphs twice. This detects and removes
        # the duplicate block by finding repeated ## headings.
        def _deduplicate_response(text):
            lines = text.split('\n')
            heading_positions = {}
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith('## '):
                    heading_text = stripped
                    if heading_text in heading_positions:
                        # Found a duplicate heading — keep everything up to the
                        # first occurrence of this heading's second appearance,
                        # then skip forward to find where the duplicate block ends
                        # (next heading that hasn't been seen before, or end).
                        first_block_end = i
                        # Find where the duplicated block ends
                        dup_end = len(lines)
                        for j in range(i + 1, len(lines)):
                            candidate = lines[j].strip()
                            if candidate.startswith('## ') and candidate not in heading_positions:
                                dup_end = j
                                break
                        # Rebuild: everything before the dup + everything after
                        before = '\n'.join(lines[:first_block_end])
                        after = '\n'.join(lines[dup_end:])
                        result = before.rstrip()
                        if after.strip():
                            result = result + '\n\n' + after.lstrip('\n')
                        return _deduplicate_response(result)  # recurse for additional dups
                    heading_positions[heading_text] = i
            return text

        final_text = _deduplicate_response(final_text)

        # Also remove duplicate paragraphs (3+ lines that appear verbatim twice)
        paragraphs = re.split(r'\n{2,}', final_text)
        seen = set()
        unique_paragraphs = []
        for para in paragraphs:
            normalized = para.strip()
            if len(normalized) > 80 and normalized in seen:
                continue  # skip duplicate paragraph
            seen.add(normalized)
            unique_paragraphs.append(para)
        final_text = '\n\n'.join(unique_paragraphs)

        # Post-process: Remove standalone labels/badges that lack context
        # Detects lines that are just 1-3 words, all uppercase or bold, with no
        # explanatory sentence — these are internal severity/status tags the agent
        # sometimes emits (e.g., "HIGH", "UPSIDE", "Direct Answer")
        cleaned_lines = []
        for line in final_text.split('\n'):
            stripped = line.strip().lstrip('#').strip().strip('*').strip()
            # Skip if line is empty after stripping (will be handled by join)
            if not stripped:
                cleaned_lines.append(line)
                continue
            # A standalone label is: 1-3 words, no punctuation (except hyphens),
            # and either ALL CAPS or title-case with no verb/sentence structure
            words = stripped.split()
            if (len(words) <= 3
                    and len(stripped) <= 30
                    and not any(c in stripped for c in '.,:;!?()[]{}')
                    and (stripped.isupper() or stripped.istitle())
                    and not stripped.startswith('$')
                    and not any(ch.isdigit() for ch in stripped)):
                continue
            cleaned_lines.append(line)
        final_text = '\n'.join(cleaned_lines)

        # Strip trailing "Suggested next steps" section from text since the UI
        # renders suggested_queries as a dedicated tile component
        final_text = re.split(
            r'\n+(?:#{1,3}\s*)?(?:Suggested|Recommended)\s+(?:next\s+)?steps',
            final_text,
            maxsplit=1,
            flags=re.IGNORECASE
        )[0].rstrip()
        # Also strip trailing horizontal rules left behind
        final_text = re.sub(r'\n---\s*$', '', final_text).rstrip()

        # Build planning data from real classify_demand_sensing_intent result
        if classified_intent:
            # Compute HITL threshold and trigger from classify_intent output
            hitl_thresholds = {
                "DATA_QUERY": 0.40, "OPERATIONAL_KPI": 0.40,
                "DETECT": 0.55, "TREND_ANALYSIS": 0.55, "COMPARISON": 0.55,
                "LOST_SALES_ANALYSIS": 0.55, "REPLENISHMENT_HEALTH": 0.55,
                "RECOVERY_ECONOMICS": 0.65, "ROOT_CAUSE": 0.65,
                "DEMAND_DRIVER_ATTRIBUTION": 0.65, "FORECAST_ACCURACY": 0.65,
                "RISK_ASSESSMENT": 0.65, "PERISHABLE_RISK": 0.65, "PREDICTION": 0.65,
                "BENCHMARK": 0.70, "SCENARIO_ANALYSIS": 0.70,
                "RECOMMENDATION": 0.75,
            }
            ci_intent = classified_intent.get("intent", "DATA_QUERY")
            ci_confidence = classified_intent.get("confidence", 0.7)
            ci_threshold = hitl_thresholds.get(ci_intent, 0.65)
            planning = {
                "intent": ci_intent,
                "confidence": ci_confidence,
                "hitl_triggered": ci_confidence < ci_threshold,
                "hitl_threshold": ci_threshold,
                "recommended_chart": classified_intent.get("recommended_chart", "bar"),
                "viz_rationale": classified_intent.get("viz_rationale", ""),
                "sub_tasks": classified_intent.get("sub_tasks", []),
                "kpis": classified_intent.get("kpis", []),
                "entities": classified_intent.get("entities", {}),
                "visualizations": ["vega_lite_chart"] if vega_spec else (["data_table"] if result_set else []),
                "tools_called": tools_called if tools_called else [{"name": "DemandSensingAnalyst"}],
                "sql_count": len(sql_parts),
            }
        else:
            # Fallback if classify was not called (shouldn't happen normally)
            planning = {
                "intent": "DATA_QUERY",
                "confidence": 0.5,
                "recommended_chart": "bar",
                "viz_rationale": "Default visualization",
                "sub_tasks": ["Query data", "Analyze results", "Generate insights"],
                "kpis": ["demand_deviation_pct", "stockout_rate", "days_of_supply"],
                "entities": {},
                "visualizations": ["vega_lite_chart"] if vega_spec else (["data_table"] if result_set else []),
                "tools_called": tools_called if tools_called else [{"name": "DemandSensingAnalyst"}],
                "sql_count": len(sql_parts),
            }

        # Use agent's suggested queries if available, otherwise generate defaults
        if not suggested_queries:
            if "deviation" in final_text.lower() or "driver" in final_text.lower():
                suggested_queries = [
                    "What are the top 3 drivers behind this?",
                    "Project this forward under the heatwave scenario",
                    "What actions should I take?",
                ]
            elif "forecast" in final_text.lower():
                suggested_queries = [
                    "What is the confidence level for this forecast?",
                    "Compare with last year's same period",
                    "Which SKUs are driving this trend?",
                ]

        return jsonify({
            "text": final_text,
            "sql": sql_parts if sql_parts else None,
            "result_set": result_set,
            "vega_spec": vega_spec,
            "plotly_json": plotly_fallback,
            "suggested_queries": suggested_queries if suggested_queries else None,
            "planning": planning,
        })

    except Exception as e:
        error_msg = str(e)
        print(f"[Agent Query Error] {error_msg}")
        return jsonify({"error": f"Agent query failed: {error_msg}"}), 500


@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    """Persist user feedback with full execution trace to Snowflake."""
    try:
        body = request.get_json(force=True)
        feedback_type = body.get("feedback_type", "")
        if feedback_type not in ("thumbs_up", "thumbs_down"):
            return jsonify({"error": "feedback_type must be thumbs_up or thumbs_down"}), 400

        import json as _json

        session_id = str(body.get("session_id") or "")[:100]
        conversation_turn = int(body.get("conversation_turn") or 0)
        persona_val = str(body.get("persona") or "")[:100]
        user_query = str(body.get("query") or "")[:5000]
        response_text = str(body.get("response_text") or "")[:16777216]
        feedback_reason = str(body.get("feedback_reason") or "")[:500]
        feedback_comment = str(body.get("feedback_comment") or "")[:2000]
        detected_intent = str(body.get("detected_intent") or "")[:500]
        sub_tasks = _json.dumps(body.get("sub_tasks")) if body.get("sub_tasks") else None
        kpis_identified = _json.dumps(body.get("kpis_identified")) if body.get("kpis_identified") else None
        tools_called = _json.dumps(body.get("tools_called")) if body.get("tools_called") else None
        sql_queries = _json.dumps(body.get("sql_queries")) if body.get("sql_queries") else None
        chart_type = str(body.get("chart_type") or "")[:100]
        suggested_queries = _json.dumps(body.get("suggested_queries")) if body.get("suggested_queries") else None
        response_length = int(body.get("response_length") or 0)
        result_row_count = int(body.get("result_row_count") or 0) if body.get("result_row_count") is not None else None
        result_column_count = int(body.get("result_column_count") or 0) if body.get("result_column_count") is not None else None
        response_latency_ms = int(body.get("response_latency_ms") or 0) if body.get("response_latency_ms") is not None else None
        confidence_score = float(body.get("confidence_score")) if body.get("confidence_score") is not None else None

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_MASTER_TABLE
                (SESSION_ID, CONVERSATION_TURN, PERSONA, USER_QUERY, RESPONSE_TEXT,
                 FEEDBACK_TYPE, FEEDBACK_REASON, FEEDBACK_COMMENT,
                 DETECTED_INTENT, SUB_TASKS, KPIS_IDENTIFIED, TOOLS_CALLED,
                 SQL_QUERIES, CHART_TYPE, SUGGESTED_QUERIES,
                 RESPONSE_LENGTH, RESULT_ROW_COUNT, RESULT_COLUMN_COUNT,
                 RESPONSE_LATENCY_MS, CONFIDENCE_SCORE)
            SELECT %s, %s, %s, %s, %s,
                   %s, %s, %s,
                   %s, TRY_PARSE_JSON(%s), TRY_PARSE_JSON(%s), TRY_PARSE_JSON(%s),
                   TRY_PARSE_JSON(%s), %s, TRY_PARSE_JSON(%s),
                   %s, %s, %s,
                   %s, %s
            """,
            (
                session_id, conversation_turn, persona_val, user_query, response_text,
                feedback_type, feedback_reason, feedback_comment,
                detected_intent, sub_tasks, kpis_identified, tools_called,
                sql_queries, chart_type, suggested_queries,
                response_length, result_row_count, result_column_count,
                response_latency_ms, confidence_score,
            ),
        )

        # Get the inserted FEEDBACK_ID for triage
        feedback_id = None
        if feedback_type == "thumbs_down":
            cur2 = conn.cursor()
            cur2.execute("SELECT MAX(FEEDBACK_ID) FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.FEEDBACK_MASTER_TABLE WHERE SESSION_ID = %s AND CONVERSATION_TURN = %s", (session_id, conversation_turn))
            row = cur2.fetchone()
            if row:
                feedback_id = row[0]
            cur2.close()

        cur.close()

        # Trigger feedback loop orchestrator ASYNCHRONOUSLY for negative feedback
        # This runs in a background thread so the UI gets an instant response
        if feedback_id and feedback_type == "thumbs_down":
            def _run_feedback_loop(fid):
                try:
                    bg_conn = get_connection()
                    bg_cur = bg_conn.cursor()
                    bg_cur.execute("CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SP_FEEDBACK_LOOP_ORCHESTRATOR(%s)", (fid,))
                    bg_result = bg_cur.fetchone()
                    bg_cur.close()
                    if bg_result:
                        print(f"[Feedback Loop] {bg_result[0]}")
                except Exception as bg_err:
                    print(f"[Feedback Loop Warning] Background: {bg_err}")

            thread = threading.Thread(target=_run_feedback_loop, args=(feedback_id,), daemon=True)
            thread.start()
            print(f"[Feedback Loop] Orchestrator launched in background for feedback_id={feedback_id}")

        return jsonify({"success": True})
    except Exception as e:
        print(f"[Feedback Error] {e}")
        return jsonify({"error": str(e)}), 500


# ── RAG Pipeline Endpoints ────────────────────────────────────────────────────

@app.route("/api/rag/search", methods=["POST"])
def api_rag_search():
    """Search the knowledge base using Cortex Search service."""
    try:
        conn = get_connection()
        body = request.get_json(force=True)
        query = body.get("query", "").strip()
        if not query:
            return jsonify({"error": "query is required"}), 400

        limit = min(int(body.get("limit", 5)), 10)
        category_filter = body.get("category")

        import json

        search_params = {
            "query": query,
            "columns": ["TITLE", "CONTENT", "CATEGORY", "DOC_ID", "DEPARTMENT", "PERSONA_RELEVANCE"],
            "limit": limit,
        }
        if category_filter and category_filter != "all":
            search_params["filter"] = {"@eq": {"CATEGORY": category_filter}}

        params_json = json.dumps(search_params).replace("'", "''")

        sql = f"""
            SELECT PARSE_JSON(
                SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
                    'DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.DEMAND_SENSING_RAG_SEARCH',
                    '{params_json}'
                )
            )['results'] AS results
        """
        cur = conn.cursor()
        cur.execute(sql)
        row = cur.fetchone()
        if row and row[0]:
            results = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            return jsonify({"results": results, "query": query})
        return jsonify({"results": [], "query": query})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/rag/documents")
def api_rag_documents():
    """List all documents in the knowledge base."""
    try:
        conn = get_connection()
        category = request.args.get("category")

        sql = """
            SELECT DOC_ID, CATEGORY, TITLE, DEPARTMENT, PERSONA_RELEVANCE,
                   CREATED_DATE, VERSION, TAGS, LENGTH(CONTENT) as CONTENT_LENGTH
            FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RAG_KNOWLEDGE_BASE
        """
        if category and category != "all":
            sql += f" WHERE CATEGORY = '{category.replace(chr(39), '')}'"
        sql += " ORDER BY CATEGORY, DOC_ID"

        cur = conn.cursor()
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description]
        rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify({"documents": rows, "total": len(rows)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/rag/document/<doc_id>")
def api_rag_document_detail(doc_id):
    """Get full content of a single document."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.RAG_KNOWLEDGE_BASE WHERE DOC_ID = %s",
            (doc_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Document not found"}), 404
        columns = [desc[0] for desc in cur.description]
        return jsonify(dict(zip(columns, row)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# AI OBSERVABILITY — Monitoring & Tracing for Cortex Agents
# ══════════════════════════════════════════════════════════════════════════════

OBSERVABILITY_AGENTS = {
    "Demand Analyst": {
        "Interactive": [
            {"name": "INTERACTIVE_DEMANDSENSING_AGENT", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Interactive Demand Sensing Agent"},
            {"name": "BA_SUB_ORCHESTRATOR_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "BA Sub-Orchestrator"},
            {"name": "DATA_GATHERING_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Data Gathering Agent"},
            {"name": "DIMENSIONAL_ANALYSIS_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Dimensional Analysis Agent"},
            {"name": "DS_SUB_ORCHESTRATOR_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "DS Sub-Orchestrator"},
            {"name": "FEATURE_ENHANCEMENT_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Feature Enhancement Agent"},
            {"name": "INSIGHTS_NARRATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Insights Narration Agent"},
            {"name": "PERSONA_CONTEXT_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Persona Context Agent"},
            {"name": "PREDICTIVE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Predictive Agent"},
            {"name": "PRESCRIPTIVE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Prescriptive Agent"},
            {"name": "ROOT_CAUSE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Root Cause Agent"},
            {"name": "TREND_DISCOVERY_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Trend Discovery Agent"},
            {"name": "VALIDATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Validation Agent"},
            {"name": "VISUALIZATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Visualization Agent"},
        ],
        "Autonomous": [
            {"name": "MASTER_ORCHESTRATOR_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Master Orchestrator"},
            {"name": "BA_SUB_ORCHESTRATOR_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "BA Sub-Orchestrator"},
            {"name": "DATA_GATHERING_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Data Gathering Agent"},
            {"name": "DIMENSIONAL_ANALYSIS_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Dimensional Analysis Agent"},
            {"name": "DS_SUB_ORCHESTRATOR_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "DS Sub-Orchestrator"},
            {"name": "FEATURE_ENHANCEMENT_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Feature Enhancement Agent"},
            {"name": "INSIGHTS_NARRATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Insights Narration Agent"},
            {"name": "PERSONA_CONTEXT_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Persona Context Agent"},
            {"name": "PREDICTIVE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Predictive Agent"},
            {"name": "PRESCRIPTIVE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Prescriptive Agent"},
            {"name": "ROOT_CAUSE_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Root Cause Agent"},
            {"name": "TREND_DISCOVERY_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Trend Discovery Agent"},
            {"name": "VALIDATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Validation Agent"},
            {"name": "VISUALIZATION_AGENT_DEMANDSENSING", "database": "DEMANDSENSING_AI", "schema": "DEMANDSENSING_SCHEMA", "display_name": "Visualization Agent"},
        ],
    },
}


def _run_query(sql):
    """Execute a SQL query and return results as a list of dicts."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql)
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in cur.fetchall()]


@app.route("/api/observability/agents")
def api_observability_agents():
    """Return available agents organized by persona and module."""
    return jsonify(OBSERVABILITY_AGENTS)


@app.route("/api/observability/threads")
def api_observability_threads():
    """Return list of conversation threads for a given agent."""
    try:
        agent_name = request.args.get("agent_name", "INTERACTIVE_DEMANDSENSING_AGENT")
        schema = request.args.get("schema", "DEMANDSENSING_SCHEMA")
        database = request.args.get("database", "DEMANDSENSING_AI")
        days = int(request.args.get("days", "30"))

        sql = f"""
        WITH request_events AS (
            SELECT
                RECORD_ATTRIBUTES:"ai.observability.record_id"::STRING AS record_id,
                RECORD_ATTRIBUTES:"ai.observability.record_root.input"::STRING AS user_question,
                RECORD_ATTRIBUTES:"ai.observability.record_root.output"::STRING AS agent_response,
                RESOURCE_ATTRIBUTES:"snow.user.name"::STRING AS user_name,
                TIMESTAMP AS ts
            FROM TABLE(SNOWFLAKE.LOCAL.GET_AI_OBSERVABILITY_EVENTS(
                '{database}', '{schema}', '{agent_name}', 'CORTEX AGENT'))
            WHERE RECORD:"name"::STRING = 'AgentV2RequestResponseInfo'
              AND TIMESTAMP >= DATEADD('day', -{days}, CURRENT_TIMESTAMP())
        ),
        trace_stats AS (
            SELECT
                RECORD_ATTRIBUTES:"ai.observability.record_id"::STRING AS record_id,
                COUNT(*) AS total_spans,
                COUNT(CASE WHEN RECORD:"name"::STRING LIKE 'ToolCall%' THEN 1 END) AS tool_calls_count,
                COUNT(CASE WHEN RECORD:"status":"code"::STRING != 'STATUS_CODE_OK' THEN 1 END) AS error_count,
                MIN(TIMESTAMP) AS start_ts,
                MAX(TIMESTAMP) AS end_ts,
                DATEDIFF('millisecond', MIN(TIMESTAMP), MAX(TIMESTAMP)) AS duration_ms
            FROM TABLE(SNOWFLAKE.LOCAL.GET_AI_OBSERVABILITY_EVENTS(
                '{database}', '{schema}', '{agent_name}', 'CORTEX AGENT'))
            WHERE TIMESTAMP >= DATEADD('day', -{days}, CURRENT_TIMESTAMP())
            GROUP BY 1
        )
        SELECT
            r.record_id,
            LEFT(r.user_question, 300) AS user_question,
            r.user_name,
            r.ts AS timestamp,
            CASE WHEN COALESCE(t.error_count, 0) > 0 THEN 'error' ELSE 'success' END AS status,
            COALESCE(t.total_spans, 0) AS total_spans,
            COALESCE(t.tool_calls_count, 0) AS tool_calls_count,
            COALESCE(t.duration_ms, 0) AS duration_ms
        FROM request_events r
        LEFT JOIN trace_stats t ON r.record_id = t.record_id
        ORDER BY r.ts DESC
        LIMIT 100
        """
        rows = _run_query(sql)
        threads = []
        for row in rows:
            threads.append({
                "record_id": row.get("RECORD_ID"),
                "user_question": row.get("USER_QUESTION"),
                "user_name": row.get("USER_NAME"),
                "timestamp": str(row.get("TIMESTAMP", "")),
                "status": row.get("STATUS", "success"),
                "total_spans": row.get("TOTAL_SPANS", 0),
                "tool_calls_count": row.get("TOOL_CALLS_COUNT", 0),
                "duration_ms": row.get("DURATION_MS", 0),
            })
        return jsonify(threads)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/observability/thread/<record_id>")
def api_observability_thread_detail(record_id):
    """Return full span tree for a conversation thread."""
    try:
        agent_name = request.args.get("agent_name", "INTERACTIVE_DEMANDSENSING_AGENT")
        schema = request.args.get("schema", "DEMANDSENSING_SCHEMA")
        database = request.args.get("database", "DEMANDSENSING_AI")

        # Get the user question and response
        summary_sql = f"""
        SELECT
            RECORD_ATTRIBUTES:"ai.observability.record_root.input"::STRING AS user_question,
            LEFT(RECORD_ATTRIBUTES:"ai.observability.record_root.output"::STRING, 5000) AS agent_response
        FROM TABLE(SNOWFLAKE.LOCAL.GET_AI_OBSERVABILITY_EVENTS(
            '{database}', '{schema}', '{agent_name}', 'CORTEX AGENT'))
        WHERE RECORD:"name"::STRING = 'AgentV2RequestResponseInfo'
          AND RECORD_ATTRIBUTES:"ai.observability.record_id"::STRING = '{record_id}'
        LIMIT 1
        """
        summary_rows = _run_query(summary_sql)
        user_question = ""
        agent_response = ""
        if summary_rows:
            user_question = summary_rows[0].get("USER_QUESTION", "")
            agent_response = summary_rows[0].get("AGENT_RESPONSE", "")

        # Get all spans for this trace
        spans_sql = f"""
        SELECT
            TRACE:"span_id"::STRING AS span_id,
            RECORD:"parent_span_id"::STRING AS parent_span_id,
            RECORD:"name"::STRING AS span_name,
            RECORD:"status":"code"::STRING AS status_code,
            RECORD_ATTRIBUTES:"snow.ai.observability.agent.planning.duration"::NUMBER AS planning_ms,
            RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.custom_tool.name"::STRING AS tool_name,
            RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.custom_tool.duration"::NUMBER AS tool_duration_ms,
            RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.sql_execution.duration"::NUMBER AS sql_duration_ms,
            RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.sql_execution.status"::STRING AS sql_status,
            LEFT(RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.sql_execution.query"::STRING, 500) AS sql_query,
            LEFT(RECORD_ATTRIBUTES:"snow.ai.observability.agent.tool.sql_execution.status.description"::STRING, 300) AS sql_error_desc,
            TIMESTAMP
        FROM TABLE(SNOWFLAKE.LOCAL.GET_AI_OBSERVABILITY_EVENTS(
            '{database}', '{schema}', '{agent_name}', 'CORTEX AGENT'))
        WHERE RECORD_ATTRIBUTES:"ai.observability.record_id"::STRING = '{record_id}'
        ORDER BY TIMESTAMP ASC
        """
        span_rows = _run_query(spans_sql)
        spans = []
        for row in span_rows:
            duration_ms = row.get("PLANNING_MS") or row.get("TOOL_DURATION_MS") or row.get("SQL_DURATION_MS")
            spans.append({
                "span_id": row.get("SPAN_ID"),
                "parent_span_id": row.get("PARENT_SPAN_ID"),
                "span_name": row.get("SPAN_NAME"),
                "status_code": row.get("STATUS_CODE", "STATUS_CODE_OK"),
                "duration_ms": duration_ms,
                "tool_name": row.get("TOOL_NAME"),
                "sql_duration_ms": row.get("SQL_DURATION_MS"),
                "sql_status": row.get("SQL_STATUS"),
                "sql_query": row.get("SQL_QUERY"),
                "sql_error_desc": row.get("SQL_ERROR_DESC"),
                "timestamp": str(row.get("TIMESTAMP", "")),
            })

        return jsonify({
            "record_id": record_id,
            "user_question": user_question,
            "agent_response": agent_response,
            "spans": spans,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Startup ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    _startup_auth()
    print("\n  Vibe Analytics — Demand Sensing: API Backend")
    print("  Flask API Server (for React frontend)")
    print("  ---------------------------------------------")
    port = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "5001")))
    print(f"  API: http://localhost:{port}/api/*")
    print(f"  OAuth callback: http://localhost:{port}/")
    print("  React frontend: http://localhost:3000")
    print("  (Start with: cd frontend && npm run dev)\n")
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)

import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";

/**
 * Next.js route handler for the interactive agent query.
 *
 * /api/agent/query calls Snowflake's DATA_AGENT_RUN which can take 30-90s.
 * The Next.js rewrite proxy has a short idle socket timeout that fires before
 * the backend responds, producing ECONNRESET on the frontend. This route
 * handler bypasses the rewrite by fetching directly from the Next.js server
 * process (where BACKEND_URL resolves over Docker's internal network) and
 * streams the response back without a proxy timeout limit.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/agent/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(600_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend unreachable";
    return new Response(JSON.stringify({ error: msg }), {
      status: 504,
      headers: { "Content-Type": "application/json" },
    });
  }

  const json = await backendRes.text();
  return new Response(json, {
    status: backendRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

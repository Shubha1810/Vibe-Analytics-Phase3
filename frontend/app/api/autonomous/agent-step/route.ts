import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";

/**
 * Next.js route handler for individual autonomous agent node execution.
 *
 * Each node calls Snowflake Cortex and can take up to 3 minutes.
 * The Next.js rewrite proxy short-circuits long connections with ECONNRESET.
 * This handler fetches directly on the server side with a 3-minute timeout.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/autonomous/agent-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(180_000),
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

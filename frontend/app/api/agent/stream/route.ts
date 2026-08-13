import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:5001";

/**
 * Next.js route handler for the interactive agent SSE stream.
 *
 * Same buffering problem as /api/autonomous/run-pipeline — the rewrite proxy
 * would buffer the full response before forwarding. This route handler pipes
 * the ReadableStream directly to the browser.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const backendRes = await fetch(`${BACKEND_URL}/api/agent/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

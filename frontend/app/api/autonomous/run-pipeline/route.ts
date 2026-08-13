import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:5001";

/**
 * Next.js route handler for the autonomous pipeline SSE stream.
 *
 * The Next.js rewrite proxy (`next.config.ts`) buffers responses in production,
 * which breaks Server-Sent Events — all node_start/node_done events arrive at
 * once instead of in real-time. Route handlers take precedence over rewrites
 * for the same path and can pipe the backend ReadableStream directly to the
 * browser without any buffering.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const backendRes = await fetch(
    `${BACKEND_URL}/api/autonomous/run-pipeline`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }
  );

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

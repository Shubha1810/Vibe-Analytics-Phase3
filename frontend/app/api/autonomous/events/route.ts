import { NextRequest, NextResponse } from "next/server";
import { executeStatement, parseRows } from "@/lib/snowflake-api";
import type { OrchestrationEvent } from "@/lib/orchestration-types";

export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get("run_id");

    if (!runId) {
      return NextResponse.json(
        { error: "run_id query parameter is required" },
        { status: 400 }
      );
    }

    if (!/^run-[a-f0-9]{8,20}$/.test(runId)) {
      return NextResponse.json(
        { error: "Invalid run_id format" },
        { status: 400 }
      );
    }

    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_EVENTS('${runId}')`;
    const response = await executeStatement(sql);
    const rows = parseRows(response) as unknown as OrchestrationEvent[];

    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

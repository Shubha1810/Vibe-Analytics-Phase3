import { NextResponse } from "next/server";
import { executeStatement, parseSingleVariant } from "@/lib/snowflake-api";

export async function GET() {
  try {
    const sql = "CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_GRAPH('autonomous')";
    const response = await executeStatement(sql);
    const graph = parseSingleVariant(response);

    if (!graph) {
      return NextResponse.json(
        { error: "No graph returned from orchestrator" },
        { status: 500 },
      );
    }

    return NextResponse.json(graph);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch graph";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

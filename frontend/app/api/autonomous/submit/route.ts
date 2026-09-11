import { NextRequest, NextResponse } from "next/server";
import { executeStatement, parseSingleValue } from "@/lib/snowflake-api";

export async function POST(req: NextRequest) {
  try {
    const { personas } = (await req.json()) as { personas: string[] };

    if (!personas || personas.length === 0) {
      return NextResponse.json(
        { error: "At least one persona is required" },
        { status: 400 }
      );
    }

    const ALLOWED_PERSONAS = ["Director of Demand Planning", "Supply Chain Director"];
    const invalid = personas.filter((p: string) => !ALLOWED_PERSONAS.includes(p));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid persona(s): ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    const personaList = personas.join(",");
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', '${personaList}')`;

    const response = await executeStatement(sql);
    const value = parseSingleValue(response);

    if (!value) {
      return NextResponse.json(
        { error: "No response from orchestration procedure" },
        { status: 500 }
      );
    }

    if (value.startsWith("ERROR:")) {
      return NextResponse.json({ error: value }, { status: 400 });
    }

    return NextResponse.json({ run_id: value });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

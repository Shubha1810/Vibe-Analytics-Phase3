import { NextResponse } from "next/server";
import { executeStatement, parseRows } from "@/lib/snowflake-api";

export interface PersonaEntry {
  display_title: string;
  departments: string[];
  persona_count: number;
  is_default: boolean;
}

export async function GET() {
  try {
    const sql = "CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_PERSONAS()";
    const response = await executeStatement(sql);
    const rows = parseRows(response);

    const personas: PersonaEntry[] = rows.map((r) => ({
      display_title: String(r.DISPLAY_TITLE ?? ""),
      departments: Array.isArray(r.DEPARTMENTS)
        ? r.DEPARTMENTS.map(String)
        : JSON.parse(String(r.DEPARTMENTS || "[]")),
      persona_count: Number(r.PERSONA_COUNT ?? 0),
      is_default: r.IS_DEFAULT === true || String(r.IS_DEFAULT).toUpperCase() === "TRUE",
    }));

    return NextResponse.json(personas);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch personas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

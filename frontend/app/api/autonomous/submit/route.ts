import { NextRequest, NextResponse } from "next/server";
import { executeStatement, parseSingleValue } from "@/lib/snowflake-api";
import type { PersonaKey } from "@/lib/orchestration-types";

const ALLOWED_TITLES = [
  "Demand Planner",
  "Supply Planner",
  "Director of Demand Planning",
] as const;

type AllowedTitle = (typeof ALLOWED_TITLES)[number];

const TITLE_TO_KEY: Record<AllowedTitle, PersonaKey> = {
  "Demand Planner": "demand_planner",
  "Supply Planner": "supply_planner",
  "Director of Demand Planning": "director",
};

async function submitSingle(title: string, dept: string | null): Promise<string> {
  const deptArg = dept ? `'${dept.replace(/'/g, "''")}'` : "NULL";
  const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', '${title}', ${deptArg}, NULL)`;
  const response = await executeStatement(sql);
  const value = parseSingleValue(response);
  if (!value) throw new Error(`No response from orchestration for ${title}`);
  if (value.startsWith("ERROR:")) throw new Error(value);
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      run_all?: boolean;
      persona_title?: string;
      department?: string | null;
    };

    // ── Run all 3 personas in parallel ──
    if (body.run_all) {
      const results = await Promise.allSettled(
        ALLOWED_TITLES.map((title) => submitSingle(title, null)),
      );

      const run_ids: Record<string, string | null> = {};
      const errors: string[] = [];

      ALLOWED_TITLES.forEach((title, i) => {
        const key = TITLE_TO_KEY[title];
        const r = results[i];
        if (r.status === "fulfilled") {
          run_ids[key] = r.value;
        } else {
          run_ids[key] = null;
          errors.push(`${title}: ${r.reason?.message || "Unknown error"}`);
        }
      });

      if (Object.values(run_ids).every((v) => v === null)) {
        return NextResponse.json(
          { error: `All submissions failed: ${errors.join("; ")}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ run_ids, errors: errors.length > 0 ? errors : undefined });
    }

    // ── Single persona (backward compatible) ──
    const title = body.persona_title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "persona_title is required (or set run_all: true)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TITLES.includes(title as AllowedTitle)) {
      return NextResponse.json(
        { error: `Invalid persona_title: ${title}. Valid: ${ALLOWED_TITLES.join(", ")}` },
        { status: 400 },
      );
    }

    const dept = body.department?.trim() || null;
    const run_id = await submitSingle(title, dept);
    return NextResponse.json({ run_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

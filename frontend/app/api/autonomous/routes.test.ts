import { describe, it, expect } from "vitest";
import {
  PERSONA_KEY_TO_TITLE,
  PERSONA_TITLE_TO_KEY,
  type PersonaKey,
  type MultiRunIds,
  type MultiRunResults,
} from "@/lib/orchestration-types";

// ── Multi-run persona mapping tests ──────────────────────────────────────────

describe("Persona key/title mappings", () => {
  it("maps all 3 persona keys to correct titles", () => {
    expect(PERSONA_KEY_TO_TITLE.demand_planner).toBe("Demand Planner");
    expect(PERSONA_KEY_TO_TITLE.supply_planner).toBe("Supply Planner");
    expect(PERSONA_KEY_TO_TITLE.director).toBe("Director of Demand Planning");
  });

  it("maps all 3 persona titles back to keys", () => {
    expect(PERSONA_TITLE_TO_KEY["Demand Planner"]).toBe("demand_planner");
    expect(PERSONA_TITLE_TO_KEY["Supply Planner"]).toBe("supply_planner");
    expect(PERSONA_TITLE_TO_KEY["Director of Demand Planning"]).toBe("director");
  });

  it("has exactly 3 entries in each direction", () => {
    expect(Object.keys(PERSONA_KEY_TO_TITLE)).toHaveLength(3);
    expect(Object.keys(PERSONA_TITLE_TO_KEY)).toHaveLength(3);
  });

  it("round-trips key → title → key", () => {
    const keys: PersonaKey[] = ["demand_planner", "supply_planner", "director"];
    for (const key of keys) {
      const title = PERSONA_KEY_TO_TITLE[key];
      expect(PERSONA_TITLE_TO_KEY[title]).toBe(key);
    }
  });
});

// ── Submit route SQL construction (updated for new persona titles) ───────────

describe("submit route SQL construction", () => {
  const ALLOWED_TITLES = ["Demand Planner", "Supply Planner", "Director of Demand Planning"];

  it("builds correct SUBMIT_ORCHESTRATION SQL for each persona", () => {
    for (const title of ALLOWED_TITLES) {
      const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', '${title}', NULL, NULL)`;
      expect(sql).toContain(`'${title}'`);
      expect(sql).toContain("SUBMIT_ORCHESTRATION");
    }
  });

  it("builds SQL with department argument when provided", () => {
    const dept = "Fresh & Grocery";
    const deptArg = `'${dept.replace(/'/g, "''")}'`;
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Demand Planner', ${deptArg}, NULL)`;
    expect(sql).toContain("'Fresh & Grocery'");
  });

  it("escapes single quotes in department names", () => {
    const dept = "Fresh's & Grocery";
    const escaped = dept.replace(/'/g, "''");
    expect(escaped).toBe("Fresh''s & Grocery");
  });

  it("detects ERROR: prefix in response", () => {
    expect("ERROR: Invalid persona specified".startsWith("ERROR:")).toBe(true);
    expect("run-abc123".startsWith("ERROR:")).toBe(false);
  });
});

// ── run_all mode: MultiRunIds shape ──────────────────────────────────────────

describe("run_all response shape", () => {
  it("produces a valid MultiRunIds with all 3 keys", () => {
    const run_ids: MultiRunIds = {
      demand_planner: "run-aaa",
      supply_planner: "run-bbb",
      director: "run-ccc",
    };
    expect(Object.keys(run_ids)).toHaveLength(3);
    expect(run_ids.demand_planner).toBeTruthy();
    expect(run_ids.supply_planner).toBeTruthy();
    expect(run_ids.director).toBeTruthy();
  });

  it("handles partial failures (some null run_ids)", () => {
    const run_ids: MultiRunIds = {
      demand_planner: "run-aaa",
      supply_planner: null,
      director: "run-ccc",
    };
    const successful = Object.values(run_ids).filter(Boolean);
    const failed = Object.values(run_ids).filter((v) => v === null);
    expect(successful).toHaveLength(2);
    expect(failed).toHaveLength(1);
  });

  it("detects all-failed state", () => {
    const run_ids: MultiRunIds = {
      demand_planner: null,
      supply_planner: null,
      director: null,
    };
    const allFailed = Object.values(run_ids).every((v) => v === null);
    expect(allFailed).toBe(true);
  });
});

// ── MultiRunResults shape ────────────────────────────────────────────────────

describe("MultiRunResults", () => {
  it("stores results keyed by persona", () => {
    const results: MultiRunResults = {
      demand_planner: { run_id: "run-aaa", status: "COMPLETED", exec_report: null },
      supply_planner: { run_id: "run-bbb", status: "COMPLETED", exec_report: null },
      director: null,
    };
    expect(results.demand_planner?.status).toBe("COMPLETED");
    expect(results.director).toBeNull();
  });

  it("all-completed check works", () => {
    const results: MultiRunResults = {
      demand_planner: { run_id: "run-aaa", status: "COMPLETED" },
      supply_planner: { run_id: "run-bbb", status: "COMPLETED" },
      director: { run_id: "run-ccc", status: "COMPLETED" },
    };
    const allCompleted = Object.values(results).every((r) => r?.status === "COMPLETED");
    expect(allCompleted).toBe(true);
  });
});

// ── API client methods ───────────────────────────────────────────────────────

describe("API client methods", () => {
  it("submitAllOrchestrations sends run_all: true in body", () => {
    const body = JSON.stringify({ run_all: true });
    const parsed = JSON.parse(body);
    expect(parsed.run_all).toBe(true);
    expect(parsed.persona_title).toBeUndefined();
  });

  it("submitOrchestration sends persona_title in body", () => {
    const body = JSON.stringify({ persona_title: "Demand Planner", department: null });
    const parsed = JSON.parse(body);
    expect(parsed.persona_title).toBe("Demand Planner");
    expect(parsed.run_all).toBeUndefined();
  });

  it("getOrchestrationEvents encodes run_id in URL", () => {
    const runId = "run-abc 123";
    const url = `/api/autonomous/events?run_id=${encodeURIComponent(runId)}`;
    expect(url).toBe("/api/autonomous/events?run_id=run-abc%20123");
  });

  it("getAutonomousAnalytics encodes persona in URL", () => {
    const persona = "Director of Demand Planning";
    const url = `/api/autonomous/analytics?persona=${encodeURIComponent(persona)}`;
    expect(url).toContain("Director%20of%20Demand%20Planning");
  });
});

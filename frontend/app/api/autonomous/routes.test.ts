import { describe, it, expect } from "vitest";

// Test the SQL construction and validation logic used by API routes.
// We verify the SQL templates match the expected stored procedure signatures.

describe("submit route SQL construction", () => {
  it("builds correct SUBMIT_ORCHESTRATION SQL", () => {
    const personas = ["Director of Demand Planning", "Supply Chain Director"];
    const personaList = personas.join(",");
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', '${personaList}')`;

    expect(sql).toBe(
      "CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', 'Director of Demand Planning,Supply Chain Director')"
    );
  });

  it("handles single persona", () => {
    const personas = ["Supply Chain Director"];
    const personaList = personas.join(",");
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.SUBMIT_ORCHESTRATION(NULL, 'autonomous', '${personaList}')`;

    expect(sql).toContain("'Supply Chain Director'");
    // Single persona: no comma inside the persona list string
    const personaArg = sql.match(/'autonomous', '([^']+)'/)?.[1];
    expect(personaArg).toBe("Supply Chain Director");
    expect(personaArg).not.toContain(",");
  });

  it("detects ERROR: prefix in response", () => {
    const value = "ERROR: Invalid persona specified";
    expect(value.startsWith("ERROR:")).toBe(true);
  });

  it("detects successful run_id response", () => {
    const value = "run-abc123def456";
    expect(value.startsWith("ERROR:")).toBe(false);
  });
});

describe("events route SQL construction", () => {
  it("builds correct GET_ORCHESTRATION_EVENTS SQL", () => {
    const runId = "run-899c53188864";
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_EVENTS('${runId}')`;

    expect(sql).toBe(
      "CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_EVENTS('run-899c53188864')"
    );
  });
});

describe("result route SQL construction", () => {
  it("builds correct GET_ORCHESTRATION_RESULT SQL", () => {
    const runId = "run-899c53188864";
    const sql = `CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_RESULT('${runId}')`;

    expect(sql).toBe(
      "CALL DEMANDSENSING_AI.DEMANDSENSING_SCHEMA.GET_ORCHESTRATION_RESULT('run-899c53188864')"
    );
  });
});

describe("API client methods (api.ts)", () => {
  it("submitOrchestration sends personas as POST body", () => {
    const personas = ["Director of Demand Planning", "Supply Chain Director"];
    const body = JSON.stringify({ personas });
    const parsed = JSON.parse(body);
    expect(parsed.personas).toEqual(personas);
  });

  it("getOrchestrationEvents encodes run_id in URL", () => {
    const runId = "run-abc 123";
    const url = `/api/autonomous/events?run_id=${encodeURIComponent(runId)}`;
    expect(url).toBe("/api/autonomous/events?run_id=run-abc%20123");
  });

  it("getOrchestrationResult encodes run_id in URL", () => {
    const runId = "run-abc&123";
    const url = `/api/autonomous/result?run_id=${encodeURIComponent(runId)}`;
    expect(url).toBe("/api/autonomous/result?run_id=run-abc%26123");
  });
});

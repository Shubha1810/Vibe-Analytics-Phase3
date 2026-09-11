import { describe, it, expect } from "vitest";
import { parseRows, parseSingleValue, parseSingleVariant } from "@/lib/snowflake-api";

// Test the pure parsing functions from snowflake-api.ts
// We cannot test executeStatement without mocking fetch (server-side only).

describe("parseSingleValue", () => {
  it("returns the first cell of the first row", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [["run-abc123"]],
    };
    expect(parseSingleValue(response)).toBe("run-abc123");
  });

  it("returns null when data is empty", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [],
    };
    expect(parseSingleValue(response)).toBeNull();
  });

  it("returns null when data is undefined", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
    };
    expect(parseSingleValue(response)).toBeNull();
  });

  it("returns null when first row is empty", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [[]],
    };
    expect(parseSingleValue(response)).toBeNull();
  });
});

describe("parseSingleVariant", () => {
  it("parses a JSON string from the first cell", () => {
    const obj = { run_id: "abc", status: "COMPLETED", exec_report: null };
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [[JSON.stringify(obj)]],
    };
    expect(parseSingleVariant(response)).toEqual(obj);
  });

  it("returns null when data is empty", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [],
    };
    expect(parseSingleVariant(response)).toBeNull();
  });

  it("returns raw string if JSON.parse fails", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      data: [["not-json"]],
    };
    expect(parseSingleVariant(response)).toBe("not-json");
  });
});

describe("parseRows", () => {
  it("maps column-major response into row objects", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [
          { name: "NODE_NAME", type: "TEXT" },
          { name: "STATUS", type: "TEXT" },
          { name: "DURATION_MS", type: "FIXED" },
        ],
        numRows: 2,
      },
      data: [
        ["master_plan", "ok", "1234"],
        ["data_gathering", "RUNNING", "5678"],
      ],
    };
    const rows = parseRows(response);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ NODE_NAME: "master_plan", STATUS: "ok", DURATION_MS: 1234 });
    expect(rows[1]).toEqual({ NODE_NAME: "data_gathering", STATUS: "RUNNING", DURATION_MS: 5678 });
  });

  it("parses VARIANT columns as JSON", () => {
    const variantData = { narrative: "test narrative", details: [1, 2] };
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [
          { name: "RESULT", type: "VARIANT" },
        ],
        numRows: 1,
      },
      data: [[JSON.stringify(variantData)]],
    };
    const rows = parseRows(response);
    expect(rows).toHaveLength(1);
    expect(rows[0].RESULT).toEqual(variantData);
  });

  it("handles null values gracefully", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [
          { name: "NODE_NAME", type: "TEXT" },
          { name: "ERROR_MSG", type: "TEXT" },
        ],
        numRows: 1,
      },
      data: [["master_plan", null as unknown as string]],
    };
    const rows = parseRows(response);
    expect(rows[0].ERROR_MSG).toBeNull();
  });

  it("returns empty array when no metadata", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
    };
    expect(parseRows(response)).toEqual([]);
  });

  it("returns empty array when no data", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [{ name: "X", type: "TEXT" }],
        numRows: 0,
      },
    };
    expect(parseRows(response)).toEqual([]);
  });

  it("handles FLOAT type columns", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [{ name: "SCORE", type: "FLOAT" }],
        numRows: 1,
      },
      data: [["3.14"]],
    };
    const rows = parseRows(response);
    expect(rows[0].SCORE).toBe(3.14);
  });

  it("keeps invalid VARIANT as string", () => {
    const response = {
      statementHandle: "h1",
      statementStatusUrl: "",
      message: "ok",
      resultSetMetaData: {
        rowType: [{ name: "DATA", type: "VARIANT" }],
        numRows: 1,
      },
      data: [["not-valid-json"]],
    };
    const rows = parseRows(response);
    expect(rows[0].DATA).toBe("not-valid-json");
  });
});

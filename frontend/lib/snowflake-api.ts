// Server-side only — used in Next.js API routes, not browser

interface StatementResponse {
  statementHandle: string;
  statementStatusUrl: string;
  message: string;
  resultSetMetaData?: {
    rowType: { name: string; type: string }[];
    numRows: number;
  };
  data?: string[][];
  code?: string;
}

function getConfig() {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const token = process.env.SNOWFLAKE_TOKEN;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE ?? "COCO_HOL_WH";
  const database = process.env.SNOWFLAKE_DATABASE ?? "DEMANDSENSING_AI";
  const role = process.env.SNOWFLAKE_ROLE ?? "ACCOUNTADMIN";
  const host =
    process.env.SNOWFLAKE_HOST ??
    `${account}.snowflakecomputing.com`;

  if (!account || !token) {
    throw new Error(
      "Missing SNOWFLAKE_ACCOUNT or SNOWFLAKE_TOKEN environment variables"
    );
  }

  return { account, token, warehouse, database, role, host };
}

async function pollStatement(
  handle: string,
  host: string,
  token: string,
  maxWaitMs = 120_000
): Promise<StatementResponse> {
  const url = `https://${host}/api/v2/statements/${handle}`;
  const deadline = Date.now() + maxWaitMs;
  let delay = 1000;

  while (Date.now() < deadline) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 200) {
      return (await res.json()) as StatementResponse;
    }

    if (res.status !== 202) {
      const body = await res.text();
      throw new Error(`Poll failed (${res.status}): ${body}`);
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 5000);
  }

  throw new Error(`Statement ${handle} did not complete within ${maxWaitMs}ms`);
}

export async function executeStatement(sql: string): Promise<StatementResponse> {
  const { token, warehouse, database, role, host } = getConfig();

  const res = await fetch(`https://${host}/api/v2/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      statement: sql,
      warehouse,
      database,
      role,
      timeout: 120,
    }),
  });

  if (res.status === 200) {
    return (await res.json()) as StatementResponse;
  }

  if (res.status === 202) {
    const pending = (await res.json()) as StatementResponse;
    return pollStatement(pending.statementHandle, host, token);
  }

  const body = await res.text();
  throw new Error(`SQL API error (${res.status}): ${body}`);
}

export function parseRows(
  response: StatementResponse
): Record<string, unknown>[] {
  if (!response.resultSetMetaData?.rowType || !response.data) {
    return [];
  }

  const columns = response.resultSetMetaData.rowType;
  return response.data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      let val: unknown = row[i];
      if (val !== null && val !== undefined) {
        if (col.type === "VARIANT" || col.type === "OBJECT" || col.type === "ARRAY") {
          try {
            val = JSON.parse(val as string);
          } catch {
            // keep as string
          }
        } else if (col.type === "FIXED" || col.type === "REAL" || col.type === "FLOAT") {
          const n = Number(val);
          if (!isNaN(n)) val = n;
        }
      }
      obj[col.name] = val ?? null;
    });
    return obj;
  });
}

export function parseSingleValue(response: StatementResponse): string | null {
  if (response.data && response.data.length > 0 && response.data[0].length > 0) {
    return response.data[0][0];
  }
  return null;
}

export function parseSingleVariant(response: StatementResponse): unknown {
  const raw = parseSingleValue(response);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

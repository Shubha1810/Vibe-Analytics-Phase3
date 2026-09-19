import type { OrchestrationEvent, OrchestrationResult, OrchestrationGraph, AnalyticsData, MultiRunIds } from "./orchestration-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const timeout = timeoutMs ? setTimeout(() => controller.abort("Request timed out — the query took too long to process"), timeoutMs) : null;

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export interface AuthStatus {
  status: string;
  message?: string;
  error?: string;
  account?: string;
  user?: string;
  warehouse?: string;
  auth_url?: string;
}

export interface KPI {
  label: string;
  value: number;
  icon: string;
  color: string;
  prefix?: string;
  suffix?: string;
}

export interface PlanningData {
  intent?: string;
  confidence?: number;
  hitl_triggered?: boolean;
  hitl_threshold?: number;
  recommended_chart?: string;
  viz_rationale?: string;
  sub_tasks?: string[];
  kpis?: string[];
  entities?: Record<string, unknown>;
  visualizations?: string[];
  tools_called?: { name: string; id?: string }[];
  sql_count?: number;
  thinking_time?: number;
}

export interface ChartConfig {
  chart_type: string;
  title?: string;
  subtitle?: string;
  x?: string;
  y?: string;
  sort?: string;
  ref_line?: { axis: string; value: number; label?: string };
  data_labels?: boolean;
  number_fmt?: string;
  highlight?: { condition?: string; color_neg?: string; color_pos?: string };
}

export interface AgentResponse {
  text: string;
  sql?: string[];
  result_set?: { columns: string[]; rows: unknown[][] };
  planning?: PlanningData;
  chart_config?: ChartConfig;
  vega_spec?: Record<string, unknown>;
  plotly_json?: Record<string, unknown>;
  suggested_queries?: string[];
  error?: string;
}

// ── AI Observability Types ───────────────────────────────────────────────────

export interface ObservabilityAgent {
  name: string;
  database: string;
  schema: string;
  display_name: string;
}

export type ObservabilityAgentsMap = Record<string, Record<string, ObservabilityAgent[]>>;

export interface ObservabilityThread {
  record_id: string;
  user_question: string;
  user_name: string;
  timestamp: string;
  status: "success" | "error";
  total_spans: number;
  tool_calls_count: number;
  duration_ms: number;
}

export interface TraceSpan {
  span_id: string;
  parent_span_id: string | null;
  span_name: string;
  status_code: string;
  duration_ms: number | null;
  tool_name: string | null;
  sql_duration_ms: number | null;
  sql_status: string | null;
  sql_query: string | null;
  sql_error_desc: string | null;
  timestamp: string;
}

export interface ThreadDetail {
  record_id: string;
  user_question: string;
  agent_response: string;
  user_name: string;
  timestamp: string;
  datasources: string[];
  spans: TraceSpan[];
}

export interface FeedbackPayload {
  query: string;
  response_text: string;
  feedback_type: "thumbs_up" | "thumbs_down";
  persona: string;
  feedback_reason?: string;
  feedback_comment?: string;
  session_id?: string;
  conversation_turn?: number;
  detected_intent?: string;
  sub_tasks?: string[];
  kpis_identified?: string[];
  tools_called?: { name: string; id?: string }[];
  sql_queries?: string[];
  chart_type?: string;
  suggested_queries?: string[];
  response_length?: number;
  result_row_count?: number;
  result_column_count?: number;
  response_latency_ms?: number;
  confidence_score?: number;
}

export const api = {
  getAuth: () => request<AuthStatus>("/api/auth"),

  restartAuth: () => request<AuthStatus>("/api/auth/restart", {
    method: "POST",
  }),

  getKPIs: () => request<Record<string, unknown>[]>("/api/kpis"),

  queryAgent: (question: string, context: { role: string; content: string }[], persona: string, recentKpis?: string[]) =>
    request<AgentResponse>("/api/agent/query", {
      method: "POST",
      body: JSON.stringify({ question, context, persona, recent_kpis: recentKpis || [] }),
      timeoutMs: 660000,
    }),

  cortexComplete: (prompt: string) =>
    request<{ response: string }>("/api/cortex/complete", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  submitFeedback: (payload: FeedbackPayload) =>
    request<{ success: boolean }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  search: (query: string) =>
    request<{ results: unknown[] }>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  analyst: (question: string) =>
    request<unknown>("/api/analyst", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // Autonomous Orchestration
  getPersonas: () =>
    request<{ display_title: string; departments: string[]; persona_count: number; is_default: boolean }[]>(
      "/api/autonomous/personas",
    ),

  getOrchestrationGraph: () =>
    request<OrchestrationGraph>("/api/autonomous/graph"),

  submitOrchestration: (personaTitle: string, department?: string | null) =>
    request<{ run_id: string }>("/api/autonomous/submit", {
      method: "POST",
      body: JSON.stringify({ persona_title: personaTitle, department: department || null }),
    }),

  submitAllOrchestrations: () =>
    request<{ run_ids: MultiRunIds; errors?: string[] }>("/api/autonomous/submit", {
      method: "POST",
      body: JSON.stringify({ run_all: true }),
    }),

  getOrchestrationEvents: (runId: string) =>
    request<OrchestrationEvent[]>(
      `/api/autonomous/events?run_id=${encodeURIComponent(runId)}`
    ),

  getOrchestrationResult: (runId: string) =>
    request<OrchestrationResult>(
      `/api/autonomous/result?run_id=${encodeURIComponent(runId)}`
    ),

  getAutonomousAnalytics: (persona: string) =>
    request<AnalyticsData>(
      `/api/autonomous/analytics?persona=${encodeURIComponent(persona)}`,
      { timeoutMs: 120000 },
    ),

  // RAG Pipeline
  ragSearch: (query: string, category?: string, limit?: number) =>
    request<{ results: unknown; query: string }>("/api/rag/search", {
      method: "POST",
      body: JSON.stringify({ query, category, limit: limit || 5 }),
    }),

  ragGetDocuments: (category?: string) =>
    request<{ documents: RagDocument[]; total: number }>(`/api/rag/documents${category && category !== "all" ? `?category=${encodeURIComponent(category)}` : ""}`),

  ragGetDocument: (docId: string) =>
    request<RagDocumentFull>(`/api/rag/document/${encodeURIComponent(docId)}`),

  // ── AI Observability ────────────────────────────────────────────────────────
  getObservabilityAgents: () =>
    request<ObservabilityAgentsMap>("/api/observability/agents"),

  getObservabilityThreads: (agentName: string, schema: string, database: string, days: number) =>
    request<ObservabilityThread[]>(
      `/api/observability/threads?agent_name=${encodeURIComponent(agentName)}&schema=${encodeURIComponent(schema)}&database=${encodeURIComponent(database)}&days=${days}`,
      { timeoutMs: 60000 },
    ),

  getObservabilityThreadDetail: (recordId: string, agentName: string, schema: string, database: string) =>
    request<ThreadDetail>(
      `/api/observability/thread/${encodeURIComponent(recordId)}?agent_name=${encodeURIComponent(agentName)}&schema=${encodeURIComponent(schema)}&database=${encodeURIComponent(database)}`,
      { timeoutMs: 60000 },
    ),
};

export interface RagDocument {
  DOC_ID: string;
  CATEGORY: string;
  TITLE: string;
  DEPARTMENT: string;
  PERSONA_RELEVANCE: string;
  CREATED_DATE: string;
  VERSION: string;
  TAGS: string;
  CONTENT_LENGTH: number;
}

export interface RagDocumentFull extends RagDocument {
  CONTENT: string;
}

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AgentResponse } from "@/lib/api";
import ThinkingCard from "./ThinkingCard";
import FeedbackBar from "./FeedbackBar";
import SuggestedQuestions from "./SuggestedQuestions";
import DataTable from "@/components/common/DataTable";
import AgentChart from "@/components/charts/AgentChart";
import D3Chart from "@/components/charts/D3Chart";
import { PlotlyChart } from "@/components/charts/PlotlyChart";

function escHtml(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!div) return s;
  div.textContent = s;
  return div.innerHTML;
}

function cleanAgentText(text: string): string {
  let cleaned = text.replace(/```viz\s*\n?\s*\{[\s\S]*?\}\s*\n?\s*```/g, "");
  cleaned = cleaned.replace(/\n\s*\{[^{}]*"chart_type"[^{}]*\}\s*\n?/g, "\n");
  cleaned = cleaned.replace(/```(?:python|py)?\s*\n[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/(?:^|\n)import\s+(?:plotly|pandas|matplotlib|seaborn|numpy)\b[\s\S]*?\.show\(\)\s*/gm, "\n");
  cleaned = cleaned.replace(/(?:^|\n)(?:fig\s*=\s*px\.|df\s*=\s*pd\.DataFrame|fig\.update_layout|fig\.show\(\)).*$/gm, "");
  return cleaned.trim();
}

function generateSuggestions(
  data: AgentResponse,
  query: string,
  persona: string,
  conversationHistory: { role: string; content: string }[] = [],
): string[] {
  const q = query.toLowerCase();
  const text = (data.text || "").toLowerCase();
  const combined = q + " " + text;

  // Known entities from the Demand Sensing data model
  const regions = ["north", "south", "east", "west", "northeast", "southeast", "midwest", "pacific"];
  const channels = ["retail", "wholesale", "e-commerce", "direct", "marketplace", "distributor"];
  const categories = ["beverages", "snacks", "dairy", "frozen", "personal care", "household"];

  const pastUserQueries = conversationHistory
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase());

  const allConversationText = pastUserQueries.join(" ") + " " + q;
  const mentionedRegions = regions.filter((r) => allConversationText.includes(r));
  const mentionedChannels = channels.filter((c) => allConversationText.includes(c));
  const mentionedCategories = categories.filter((c) => allConversationText.includes(c));

  const freshRegions = regions.filter((r) => !allConversationText.includes(r));
  const freshChannels = channels.filter((c) => !allConversationText.includes(c));
  const freshCategories = categories.filter((c) => !allConversationText.includes(c));

  const kpiTopics = {
    forecast: combined.includes("forecast") || combined.includes("mape") || combined.includes("accuracy"),
    demand: combined.includes("demand") || combined.includes("signal") || combined.includes("trend"),
    inventory: combined.includes("inventory") || combined.includes("stock") || combined.includes("days of supply"),
    anomaly: combined.includes("anomaly") || combined.includes("outlier") || combined.includes("spike"),
    seasonal: combined.includes("season") || combined.includes("pattern") || combined.includes("cyclical"),
    replenishment: combined.includes("replenish") || combined.includes("lead time") || combined.includes("reorder"),
  };

  const turnCount = pastUserQueries.length;
  type Depth = "overview" | "comparison" | "drilldown" | "rootcause";
  let depth: Depth = "overview";
  if (turnCount >= 3) depth = "rootcause";
  else if (turnCount >= 2) depth = "drilldown";
  else if (turnCount >= 1) depth = "comparison";

  const capitalize = (s: string) => s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const pool: string[] = [];

  const freshRegion = freshRegions[0] ? capitalize(freshRegions[0]) : "West";
  const freshChannel = freshChannels[0] ? capitalize(freshChannels[0]) : "E-Commerce";
  const freshCategory = freshCategories[0] ? capitalize(freshCategories[0]) : "Beverages";
  const currentRegion = mentionedRegions[0] ? capitalize(mentionedRegions[0]) : null;
  const currentCategory = mentionedCategories[0] ? capitalize(mentionedCategories[0]) : null;

  if (depth === "overview") {
    if (kpiTopics.forecast) {
      pool.push("Which regions have the lowest forecast accuracy (highest MAPE) this quarter?");
      pool.push(`How does forecast bias vary across ${freshCategory} vs Dairy?`);
      pool.push("What is the forecast accuracy trend over the last 6 months by region?");
    } else if (kpiTopics.inventory) {
      pool.push("Which SKUs have critically low days-of-supply right now?");
      pool.push(`How do inventory levels compare between ${freshRegion} and Northeast?`);
      pool.push("What is the overstock vs understock ratio by product category?");
    } else if (kpiTopics.anomaly) {
      pool.push("What demand anomalies were detected in the last 30 days?");
      pool.push(`Which categories in ${freshRegion} show unusual demand spikes?`);
      pool.push("How do anomaly events correlate with promotional activity?");
    } else {
      pool.push(`What is the overall demand forecast accuracy across all regions?`);
      pool.push(`Which product categories show the strongest demand growth signals?`);
      pool.push(`Show demand distribution by channel for ${freshCategory}`);
    }
  } else if (depth === "comparison") {
    if (currentRegion) {
      pool.push(`How does ${currentRegion}'s forecast accuracy compare to ${freshRegion}?`);
      pool.push(`Show demand signal strength for ${currentRegion} vs national average`);
      pool.push(`Which categories are underperforming in ${currentRegion}?`);
    } else if (currentCategory) {
      pool.push(`How does ${currentCategory} demand compare across regions?`);
      pool.push(`Which channels drive the most volume for ${currentCategory}?`);
      pool.push(`Show seasonal patterns for ${currentCategory} by region`);
    } else {
      pool.push(`Compare forecast accuracy: ${freshRegion} vs Northeast by category`);
      pool.push(`How does ${freshChannel} demand differ from Retail?`);
      pool.push("Which region has the best demand-supply balance this quarter?");
    }
  } else if (depth === "drilldown") {
    if (currentRegion && currentCategory) {
      pool.push(`Show SKU-level demand breakdown for ${currentCategory} in ${currentRegion}`);
      pool.push(`What is the replenishment cycle time for ${currentCategory} in ${currentRegion}?`);
      pool.push(`How has demand for ${currentCategory} in ${currentRegion} changed vs last year?`);
    } else if (currentRegion) {
      pool.push(`Which SKUs in ${currentRegion} have the highest stockout risk?`);
      pool.push(`Show lead time analysis for ${currentRegion} by supplier`);
      pool.push(`What is the demand forecast bias trend in ${currentRegion}?`);
    } else {
      pool.push("Which SKUs across the portfolio have demand exceeding safety stock?");
      pool.push(`Show week-over-week demand velocity for top 20 SKUs in ${freshRegion}`);
      pool.push(`What is the lead time variability by category in ${freshRegion}?`);
    }
  } else {
    pool.push("What are the root causes of forecast inaccuracy in the worst-performing region?");
    pool.push("How do supply disruptions propagate to downstream demand fulfillment?");
    pool.push("Which demand signals are the strongest leading indicators of stockouts?");
    if (currentRegion) {
      pool.push(`What operational changes would improve forecast accuracy in ${currentRegion}?`);
    }
    if (!kpiTopics.seasonal) {
      pool.push("How do seasonal decomposition patterns differ across product categories?");
    }
  }

  const filtered = pool.filter((suggestion) => {
    const sLower = suggestion.toLowerCase();
    return !pastUserQueries.some((pq) => {
      const sWords = new Set(sLower.split(/\s+/).filter((w) => w.length > 3));
      const pqWords = new Set(pq.split(/\s+/).filter((w) => w.length > 3));
      if (sWords.size === 0) return false;
      let overlap = 0;
      sWords.forEach((w) => { if (pqWords.has(w)) overlap++; });
      return overlap / sWords.size > 0.6;
    });
  });

  return filtered.slice(0, 3);
}

interface Props {
  data: AgentResponse;
  showThinking?: boolean;
  query?: string;
  persona?: string;
  conversationHistory?: { role: string; content: string }[];
  sessionId?: string;
  conversationTurn?: number;
  onLike?: () => void;
  onSuggestionSelect?: (question: string) => void;
}

export default function FinalAnswer({ data, showThinking = true, query = "", persona = "", conversationHistory = [], sessionId, conversationTurn, onLike, onSuggestionSelect }: Props) {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const suggestions = (data.suggested_queries && data.suggested_queries.length > 0)
    ? data.suggested_queries.slice(0, 3)
    : generateSuggestions(data, query, persona, conversationHistory);

  const rs = data.result_set;
  const tools = data.planning?.tools_called || [];
  const toolNames = [...new Set(tools.map(t => t.name))].join(", ");

  return (
    <div className="space-y-0 animate-fade-in">
      {showThinking && data.planning && (
        <ThinkingCard planning={data.planning} defaultCollapsed={true} />
      )}

      {data.text && (
        <div className="md-content text-[13px] leading-relaxed text-[var(--hex-text)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanAgentText(data.text)}</ReactMarkdown>
        </div>
      )}

            {data.plotly_json ? (
              <PlotlyChart spec={data.plotly_json} />
            ) : data.vega_spec ? (
              <D3Chart spec={data.vega_spec} />
      ) : (
        rs && rs.columns.length > 0 && rs.rows.length > 0 && (
          <AgentChart
            columns={rs.columns}
            rows={rs.rows}
            chartConfig={data.chart_config}
          />
        )
      )}

      {data.sql && data.sql.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setSqlExpanded(!sqlExpanded)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--hex-accent)] font-medium cursor-pointer bg-transparent border-none hover:underline"
          >
            <span className="material-icons-outlined" style={{ fontSize: "13px" }}>code</span>
            {sqlExpanded ? "Hide" : "View"} Generated SQL ({data.sql.length})
            <span
              className="material-icons-outlined transition-transform duration-200"
              style={{ fontSize: "13px", transform: sqlExpanded ? "rotate(180deg)" : "rotate(0)" }}
            >
              expand_more
            </span>
          </button>
          {sqlExpanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {data.sql.map((s, i) => (
                <div key={i}>
                  <pre
                    className="bg-[var(--hex-surface-2)] p-3 rounded-lg text-[11px] overflow-x-auto text-[var(--hex-text)] border border-[var(--border-color)] font-mono"
                  >
                    {escHtml(s)}
                  </pre>
                  {i === (data.sql?.length ?? 0) - 1 && rs && rs.columns.length > 0 && rs.rows.length > 0 && (
                    <DataTable columns={rs.columns} rows={rs.rows} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toolNames && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--hex-text-muted)]">
          <span className="material-icons-outlined" style={{ fontSize: "13px" }}>smart_toy</span>
          <span>Agent: DEMAND_SENSING_AGENT | Tools: {toolNames}</span>
        </div>
      )}

      <FeedbackBar query={query} responseText={data.text || ""} agentData={data} sessionId={sessionId} conversationTurn={conversationTurn} onLike={onLike} />

      {onSuggestionSelect && suggestions.length > 0 && (
        <SuggestedQuestions suggestions={suggestions} onSelect={onSuggestionSelect} />
      )}
    </div>
  );
}

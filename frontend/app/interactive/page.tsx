"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type AgentResponse } from "@/lib/api";
import { useApp, type ChatMessage } from "@/context/AppContext";
import ThinkingCard from "@/components/chat/ThinkingCard";
import AgreeDisagreeCard from "@/components/chat/AgreeDisagreeCard";
import FinalAnswer from "@/components/chat/FinalAnswer";

interface LikedAnswer {
  query: string;
  text: string;
  timestamp: number;
}

export default function InteractivePage() {
  const {
    persona,
    messages,
    addMessage,
    updateLastMessage,
    setMessages,
    chatHistory,
    currentChatId,
    startNewChat,
    loadChat,
    deleteChat,
    renameChat,
  } = useApp();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingData, setPendingData] = useState<AgentResponse | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [likedAnswers, setLikedAnswers] = useState<LikedAnswer[]>([]);
  const [showLiked, setShowLiked] = useState(false);
  const [showAgreeDisagree, setShowAgreeDisagree] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const onAllRevealed = useCallback(() => setShowAgreeDisagree(true), []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingData, scrollToBottom]);

  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevChatIdRef.current === undefined) {
      prevChatIdRef.current = currentChatId;
      return;
    }
    const prev = prevChatIdRef.current;
    prevChatIdRef.current = currentChatId;
    if (prev === null && currentChatId !== null) {
      return;
    }
    if (currentChatId !== prev) {
      setPendingData(null);
      setPendingQuery(null);
      setBusy(false);
      setShowAgreeDisagree(false);
    }
  }, [currentChatId]);

  const sendChat = async (overrideText?: string, isFeedbackRefinement?: boolean) => {
    const text = overrideText || input.trim();
    if (!text || (busy && !isFeedbackRefinement)) return;

    setInput("");
    setBusy(true);
    setShowAgreeDisagree(false);

    if (!isFeedbackRefinement) {
      const userMsg: ChatMessage = { role: "user", content: text };
      addMessage(userMsg);
      const thinkingMsg: ChatMessage = { role: "assistant", content: "", phase: "thinking" };
      addMessage(thinkingMsg);
    }

    try {
      const context = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? (m.content || "").slice(0, 500) : m.content,
      }));

      const kpiKeywords = [
        "forecast", "MAPE", "bias", "accuracy", "demand", "signal", "anomaly",
        "inventory", "stockout", "days of supply", "safety stock", "lead time",
        "replenishment", "reorder", "fill rate", "seasonal", "trend", "velocity",
        "SKU", "region", "channel", "category", "volume", "growth",
      ];
      const recentKpis: string[] = [];
      const recentAssistant = messages.filter((m) => m.role === "assistant" && m.content);
      for (const m of recentAssistant.slice(-3)) {
        const lower = (m.content || "").toLowerCase();
        for (const kw of kpiKeywords) {
          if (lower.includes(kw) && !recentKpis.includes(kw)) {
            recentKpis.push(kw);
          }
        }
      }
      const recentUserQueries = messages.filter((m) => m.role === "user").slice(-4).map((m) => m.content);
      for (const q of recentUserQueries) {
        const lower = q.toLowerCase();
        for (const kw of kpiKeywords) {
          if (lower.includes(kw) && !recentKpis.includes(kw)) {
            recentKpis.push(kw);
          }
        }
      }

      const data = await api.queryAgent(text, context, persona, recentKpis);

      if (data.error) {
        updateLastMessage({
          content: data.error || "An error occurred.",
          phase: "final",
          agentData: undefined,
        });
        setBusy(false);
        return;
      }

      if (isFeedbackRefinement) {
        updateLastMessage({
          role: "assistant",
          content: data.text || "",
          agentData: data,
          phase: "final",
          feedbackStep: true,
        });
        setBusy(false);
      } else {
        setPendingData(data);
        setPendingQuery(text);
        updateLastMessage({
          content: "",
          agentData: data,
          phase: "pending",
        });
      }
    } catch (err) {
      updateLastMessage({
        content: `Error: ${err instanceof Error ? err.message : "Request failed"}`,
        phase: "final",
        agentData: undefined,
      });
      setBusy(false);
    }
  };

  const handleAgree = () => {
    if (!pendingData) return;
    updateLastMessage({
      content: pendingData.text || "",
      agentData: pendingData,
      phase: "final",
    });
    setPendingData(null);
    setPendingQuery(null);
    setBusy(false);
  };

  const handleDisagree = (feedback: string) => {
    if (!feedback) {
      handleAgree();
      return;
    }
    const original = pendingQuery || "";
    const refined = `${original} [Additional context: ${feedback}]`;
    setPendingData(null);
    setPendingQuery(null);

    updateLastMessage({
      phase: "feedback",
      feedbackStep: true,
    });

    sendChat(refined, true);
  };

  const removeLiked = (index: number) => {
    setLikedAnswers((prev) => prev.filter((_, i) => i !== index));
  };

  const personaHistory = chatHistory.filter((s) => s.persona === persona);

  const getDynamicSuggestions = (): string[] => {
    return [
      "What is the overall demand forecast accuracy (MAPE) by region?",
      "Which SKUs show the highest demand growth signals this month?",
      "Show inventory health: days-of-supply across top product categories",
    ];
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-var(--header-height)-48px)] animate-fade-in">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-[260px] flex-shrink-0 flex flex-col rounded-2xl border border-[var(--border-color)] bg-white overflow-hidden animate-fade-in"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--hex-surface-1)]">
            <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "16px" }}>history</span>
            <span className="text-xs font-semibold text-[var(--hex-text)]">Chat History</span>
            <button
              onClick={() => setShowHistory(false)}
              className="ml-auto w-5 h-5 rounded flex items-center justify-center text-[var(--hex-text-muted)] hover:text-[var(--hex-text)] cursor-pointer border-none bg-transparent"
            >
              <span className="material-icons-outlined" style={{ fontSize: "14px" }}>chevron_left</span>
            </button>
          </div>
          <div className="p-2 border-b border-[var(--border-color)]">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-white cursor-pointer border-none transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
            >
              <span className="material-icons-outlined" style={{ fontSize: "14px" }}>add</span>
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {personaHistory.length === 0 && (
              <div className="text-[11px] text-[var(--hex-text-muted)] text-center py-6">
                No previous chats
              </div>
            )}
            {personaHistory.map((session) => (
              <div
                key={session.id}
                className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  session.id === currentChatId
                    ? "bg-[var(--hex-primary)]/10 border border-[var(--hex-primary)]/20"
                    : "hover:bg-[var(--hex-surface-2)] border border-transparent"
                }`}
                onClick={() => loadChat(session.id)}
              >
                <span className="material-icons-outlined text-[var(--hex-text-muted)] flex-shrink-0 mt-0.5" style={{ fontSize: "14px" }}>
                  chat_bubble_outline
                </span>
                <div className="flex-1 min-w-0">
                  {editingChatId === session.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameChat(session.id, editTitle);
                          setEditingChatId(null);
                        } else if (e.key === "Escape") {
                          setEditingChatId(null);
                        }
                      }}
                      onBlur={() => {
                        renameChat(session.id, editTitle);
                        setEditingChatId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[11px] font-medium text-[var(--hex-text)] bg-white border border-[var(--hex-primary)]/30 rounded px-1.5 py-0.5 outline-none focus:border-[var(--hex-primary)]"
                    />
                  ) : (
                    <div className="text-[11px] font-medium text-[var(--hex-text)] truncate">
                      {session.title}
                    </div>
                  )}
                  <div className="text-[9px] text-[var(--hex-text-muted)] mt-0.5">
                    {new Date(session.updatedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingChatId(session.id); setEditTitle(session.title); }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[var(--hex-text-muted)] hover:text-[var(--hex-primary)] hover:bg-[var(--hex-primary)]/10 cursor-pointer border-none bg-transparent transition-all"
                >
                  <span className="material-icons-outlined" style={{ fontSize: "12px" }}>edit</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(session.id); }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[var(--hex-text-muted)] hover:text-[var(--hex-error)] hover:bg-[var(--hex-error)]/10 cursor-pointer border-none bg-transparent transition-all"
                >
                  <span className="material-icons-outlined" style={{ fontSize: "12px" }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header Banner */}
        <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 30%, #42a5f5 70%, #80d8ff 100%)",
            boxShadow: "0 4px 20px rgba(26,35,126,0.35)",
          }}>
          <div className="absolute top-0 left-12 w-24 h-full opacity-[0.14]"
            style={{ background: "repeating-linear-gradient(60deg, white 0px, white 2px, transparent 2px, transparent 14px)" }} />
          <div className="absolute -top-4 -left-4 w-20 h-20 opacity-[0.16]"
            style={{ background: "white", transform: "rotate(45deg)", borderRadius: "6px" }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <span className="material-icons-outlined text-white" style={{ fontSize: "22px" }}>forum</span>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-0.5 tracking-tight">Interactive Module</h2>
                <p className="text-white/60 text-[11px] m-0">
                  Powered by Snowflake Intelligence — Demand Sensing Agent
                </p>
              </div>
            </div>
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold cursor-pointer border-none hover:opacity-90 transition-all"
                style={{ background: "rgba(26,35,126,0.5)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
              >
                <span className="material-icons-outlined" style={{ fontSize: "14px" }}>history</span>
                History
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-[var(--border-color)] p-5 mb-3"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #3C2CDA 0%, #5B4BE6 50%, #00B894 100%)",
                      boxShadow: "0 2px 8px rgba(60,44,218,0.3)",
                    }}>
                    <span className="text-white font-bold text-[13px] leading-none tracking-tight">VA</span>
                  </div>
                  <p className="text-[13px] text-[var(--hex-text)] leading-snug m-0">
                    I am your <strong>Demand Sensing Intelligence Assistant</strong>, powered by <strong>Snowflake Cortex AI</strong>.
                  </p>
                </div>

                <div className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--hex-surface-1)] px-4 py-3">
                  <p className="text-[12px] text-[var(--hex-text)] font-semibold mb-2.5 m-0">I can help you with:</p>
                  <ul className="space-y-2.5 text-[12px] text-[var(--hex-text-dim)] list-none pl-0 m-0">
                    <li className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-px" style={{ background: "rgba(60,44,218,0.1)" }}>
                        <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>analytics</span>
                      </div>
                      <span><strong>Forecast Accuracy:</strong> MAPE analysis, bias detection, accuracy trends by region and SKU</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-px" style={{ background: "rgba(60,44,218,0.1)" }}>
                        <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>trending_up</span>
                      </div>
                      <span><strong>Demand Signals:</strong> Leading indicators, growth patterns, anomaly detection, and signal strength</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-px" style={{ background: "rgba(60,44,218,0.1)" }}>
                        <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>inventory_2</span>
                      </div>
                      <span><strong>Inventory Health:</strong> Days-of-supply, stockout risk, safety stock optimization, overstock detection</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-px" style={{ background: "rgba(60,44,218,0.1)" }}>
                        <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>calendar_month</span>
                      </div>
                      <span><strong>Seasonal Patterns:</strong> Demand decomposition, year-over-year comparisons, cyclical trend identification</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-px" style={{ background: "rgba(60,44,218,0.1)" }}>
                        <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>local_shipping</span>
                      </div>
                      <span><strong>Replenishment:</strong> Lead time analysis, reorder point optimization, supply-demand balance scoring</span>
                    </li>
                  </ul>
                  <div className="border-t border-[var(--border-color)] mt-3 pt-2.5">
                    <p className="text-[12px] text-[var(--hex-text)] font-medium m-0">What would you like to investigate?</p>
                  </div>
                </div>

                {/* Starter suggestions */}
                <div className="mt-4 w-full">
                  <div className="grid grid-cols-1 gap-2">
                    {getDynamicSuggestions().map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendChat(q)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-[12px] text-[var(--hex-text)] border border-[var(--border-color)] bg-[var(--hex-surface-1)] hover:bg-[var(--hex-primary)]/5 hover:border-[var(--hex-primary)]/20 transition-all cursor-pointer group"
                      >
                        <span className="material-icons-outlined text-[var(--hex-primary)] group-hover:scale-110 transition-transform" style={{ fontSize: "16px" }}>arrow_forward</span>
                        <span className="group-hover:text-[var(--hex-primary)] transition-colors">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}>
              {msg.role === "user" ? (
                <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-md text-[13px] text-white"
                  style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}>
                  {msg.content}
                </div>
              ) : msg.phase === "thinking" ? (
                <ThinkingCard
                  planning={msg.agentData?.planning || null}
                  progressive={true}
                  feedbackStep={msg.feedbackStep}
                  onAllRevealed={onAllRevealed}
                />
              ) : msg.phase === "pending" && msg.agentData ? (
                <div>
                  <ThinkingCard
                    planning={msg.agentData.planning || null}
                    progressive={true}
                    feedbackStep={msg.feedbackStep}
                    onAllRevealed={onAllRevealed}
                  />
                  {showAgreeDisagree && (
                    <AgreeDisagreeCard onAgree={handleAgree} onDisagree={handleDisagree} />
                  )}
                </div>
              ) : msg.phase === "feedback" ? (
                <div className="flex items-center gap-2 text-[11px] text-[var(--hex-text-muted)] py-2">
                  <span className="spinner spinner-sm" />
                  Refining analysis with your feedback...
                </div>
              ) : msg.phase === "final" && msg.agentData ? (
                <FinalAnswer
                  data={msg.agentData}
                  query={messages.filter((m) => m.role === "user").pop()?.content || ""}
                  persona={persona}
                  conversationHistory={messages.slice(0, i).map((m) => ({ role: m.role, content: m.content }))}
                  onLike={() => {
                    const userQ = messages.filter((m) => m.role === "user").pop()?.content || "";
                    setLikedAnswers((prev) => [...prev, { query: userQ, text: msg.agentData?.text || "", timestamp: Date.now() }]);
                  }}
                  onSuggestionSelect={(q) => sendChat(q)}
                />
              ) : msg.content ? (
                <div className="md-content text-[13px] text-[var(--hex-text)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-white p-3 flex items-center gap-3"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
            placeholder="Ask about demand forecasts, inventory, signals..."
            disabled={busy}
            className="flex-1 text-[13px] text-[var(--hex-text)] placeholder:text-[var(--hex-text-muted)] outline-none border-none bg-transparent disabled:opacity-50"
          />
          <button
            onClick={() => sendChat()}
            disabled={busy || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            {busy ? (
              <span className="spinner spinner-sm" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
            ) : (
              <span className="material-icons-outlined" style={{ fontSize: "18px" }}>send</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

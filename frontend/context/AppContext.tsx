"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { type Persona, PERSONAS } from "@/lib/constants";
import type { AgentResponse } from "@/lib/api";

type Theme = "light" | "dark";

// Autonomous pipeline state types
export type PipelineStatus = "idle" | "running" | "completed";

export interface PipelineResult {
  total_nodes: number;
  completed_nodes: number;
  narration: string;
  validation_verdict: string;
  agent_results: { node_id: string; text: string; section_id: string }[];
}

export interface ScorecardData {
  [key: string]: Record<string, unknown>[] | Record<string, number> | undefined;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agentData?: AgentResponse;
  phase?: "thinking" | "pending" | "final" | "feedback";
  feedbackStep?: boolean;
}

export interface ChatSession {
  id: string;
  persona: Persona;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  persona: Persona;
  setPersona: (p: Persona) => void;
  authenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;
  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  // Chat state
  currentChatId: string | null;
  messages: ChatMessage[];
  chatHistory: ChatSession[];
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (update: Partial<ChatMessage>) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  startNewChat: () => void;
  loadChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  // Autonomous pipeline state (persists across tab navigation)
  autoStatus: PipelineStatus;
  setAutoStatus: (s: PipelineStatus) => void;
  autoCurrentPhase: number;
  setAutoCurrentPhase: (p: number) => void;
  autoPhasesCompleted: string[];
  setAutoPhasesCompleted: (p: string[] | ((prev: string[]) => string[])) => void;
  autoPipelineResult: PipelineResult | null;
  setAutoPipelineResult: (r: PipelineResult | null) => void;
  autoScorecard: ScorecardData | null;
  setAutoScorecard: (s: ScorecardData | null) => void;
  autoTotalTime: number;
  setAutoTotalTime: (t: number) => void;
  resetAutonomous: () => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = "vibe-chat-history";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadChatHistory(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChatHistory(sessions: ChatSession[]) {
  try {
    const trimmed = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaRaw] = useState<Persona>(PERSONAS[0]);
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessagesRaw] = useState<ChatMessage[]>([]);
  // Autonomous pipeline state
  const [autoStatus, setAutoStatus] = useState<PipelineStatus>("idle");
  const [autoCurrentPhase, setAutoCurrentPhase] = useState(-1);
  const [autoPhasesCompleted, setAutoPhasesCompleted] = useState<string[]>([]);
  const [autoPipelineResult, setAutoPipelineResult] = useState<PipelineResult | null>(null);
  const [autoScorecard, setAutoScorecard] = useState<ScorecardData | null>(null);
  const [autoTotalTime, setAutoTotalTime] = useState(0);
  const initialized = useRef(false);
  const isLoadingChat = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("vibe-theme") as Theme | null;
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
    const history = loadChatHistory();
    setChatHistory(history);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (initialized.current) {
      saveChatHistory(chatHistory);
    }
  }, [chatHistory]);

  const setPersona = useCallback((p: Persona) => {
    setPersonaRaw(p);
    setCurrentChatId(null);
    setMessagesRaw([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("vibe-theme", next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const persistCurrentChat = useCallback((msgs: ChatMessage[], chatId: string | null, currentPersona: Persona) => {
    if (!msgs.length || !chatId) return;
    const firstUserMsg = msgs.find((m) => m.role === "user");
    const autoTitle = firstUserMsg?.content?.slice(0, 60) || "New Chat";

    setChatHistory((prev) => {
      const existing = prev.find((s) => s.id === chatId);
      if (existing) {
        const keepTitle = existing.title;
        const updated = prev.map((s) =>
          s.id === chatId ? { ...s, messages: msgs, title: keepTitle, updatedAt: Date.now() } : s
        );
        return updated.sort((a, b) => b.updatedAt - a.updatedAt);
      } else {
        const newSession: ChatSession = {
          id: chatId,
          persona: currentPersona,
          title: autoTitle,
          messages: msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return [newSession, ...prev];
      }
    });
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessagesRaw((prev) => {
      const updated = [...prev, msg];
      return updated;
    });
  }, []);

  const updateLastMessage = useCallback((update: Partial<ChatMessage>) => {
    setMessagesRaw((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...update };
      return updated;
    });
  }, []);

  const setMessages = useCallback((msgs: ChatMessage[]) => {
    setMessagesRaw(msgs);
  }, []);

  useEffect(() => {
    if (initialized.current && messages.length > 0 && currentChatId) {
      if (isLoadingChat.current) {
        isLoadingChat.current = false;
        return;
      }
      persistCurrentChat(messages, currentChatId, persona);
    }
  }, [messages, currentChatId, persona, persistCurrentChat]);

  useEffect(() => {
    if (messages.length > 0 && !currentChatId) {
      setCurrentChatId(generateId());
    }
  }, [messages, currentChatId]);

  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessagesRaw([]);
  }, []);

  const loadChat = useCallback((chatId: string) => {
    const session = chatHistory.find((s) => s.id === chatId);
    if (session) {
      isLoadingChat.current = true;
      setCurrentChatId(session.id);
      setMessagesRaw(session.messages);
      if (session.persona !== persona) {
        setPersonaRaw(session.persona);
      }
    }
  }, [chatHistory, persona]);

  const deleteChat = useCallback((chatId: string) => {
    setChatHistory((prev) => prev.filter((s) => s.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessagesRaw([]);
    }
  }, [currentChatId]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setChatHistory((prev) =>
      prev.map((s) => s.id === chatId ? { ...s, title: newTitle.trim() } : s)
    );
  }, []);

  const resetAutonomous = useCallback(() => {
    setAutoStatus("idle");
    setAutoCurrentPhase(-1);
    setAutoPhasesCompleted([]);
    setAutoPipelineResult(null);
    setAutoScorecard(null);
    setAutoTotalTime(0);
  }, []);

  return (
    <AppContext.Provider value={{
      persona, setPersona, authenticated, setAuthenticated, theme, toggleTheme,
      sidebarOpen, toggleSidebar,
      currentChatId, messages, chatHistory,
      addMessage, updateLastMessage, setMessages,
      startNewChat, loadChat, deleteChat, renameChat,
      autoStatus, setAutoStatus,
      autoCurrentPhase, setAutoCurrentPhase,
      autoPhasesCompleted, setAutoPhasesCompleted,
      autoPipelineResult, setAutoPipelineResult,
      autoScorecard, setAutoScorecard,
      autoTotalTime, setAutoTotalTime,
      resetAutonomous,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

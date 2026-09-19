"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { type Persona, PERSONAS } from "@/lib/constants";
import type { AgentResponse } from "@/lib/api";
import type { OrchestrationEvent, OrchestrationResult, MultiRunIds, MultiRunResults, PersonaKey } from "@/lib/orchestration-types";

type Theme = "light" | "dark";

export type OrchestrationUIStatus = "idle" | "submitting" | "running" | "completed" | "failed";

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
  // Autonomous orchestration state (persists across tab navigation)
  runId: string | null;
  setRunId: (id: string | null) => void;
  runIds: MultiRunIds;
  setRunIds: (ids: MultiRunIds | ((prev: MultiRunIds) => MultiRunIds)) => void;
  orchestrationStatus: OrchestrationUIStatus;
  setOrchestrationStatus: (s: OrchestrationUIStatus) => void;
  nodeEvents: OrchestrationEvent[];
  setNodeEvents: (events: OrchestrationEvent[] | ((prev: OrchestrationEvent[]) => OrchestrationEvent[])) => void;
  orchestrationResult: OrchestrationResult | null;
  setOrchestrationResult: (r: OrchestrationResult | null) => void;
  orchestrationResults: MultiRunResults;
  setOrchestrationResults: (r: MultiRunResults | ((prev: MultiRunResults) => MultiRunResults)) => void;
  activePersonaKey: PersonaKey;
  setActivePersonaKey: (k: PersonaKey) => void;
  selectedPersonas: string[];
  setSelectedPersonas: (p: string[] | ((prev: string[]) => string[])) => void;
  orchestrationError: string | null;
  setOrchestrationError: (e: string | null) => void;
  resetAutonomous: () => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = "vibe-chat-history";

const EMPTY_RUN_IDS: MultiRunIds = { demand_planner: null, supply_planner: null, director: null };
const EMPTY_RUN_RESULTS: MultiRunResults = { demand_planner: null, supply_planner: null, director: null };

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
  // Autonomous orchestration state
  const [runId, setRunId] = useState<string | null>(null);
  const [runIds, setRunIds] = useState<MultiRunIds>({ ...EMPTY_RUN_IDS });
  const [orchestrationStatus, setOrchestrationStatus] = useState<OrchestrationUIStatus>("idle");
  const [nodeEvents, setNodeEvents] = useState<OrchestrationEvent[]>([]);
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResult | null>(null);
  const [orchestrationResults, setOrchestrationResults] = useState<MultiRunResults>({ ...EMPTY_RUN_RESULTS });
  const [activePersonaKey, setActivePersonaKey] = useState<PersonaKey>("demand_planner");
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [orchestrationError, setOrchestrationError] = useState<string | null>(null);
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
    setRunId(null);
    setRunIds({ ...EMPTY_RUN_IDS });
    setOrchestrationStatus("idle");
    setNodeEvents([]);
    setOrchestrationResult(null);
    setOrchestrationResults({ ...EMPTY_RUN_RESULTS });
    setActivePersonaKey("demand_planner");
    setSelectedPersonas([]);
    setOrchestrationError(null);
  }, []);

  return (
    <AppContext.Provider value={{
      persona, setPersona, authenticated, setAuthenticated, theme, toggleTheme,
      sidebarOpen, toggleSidebar,
      currentChatId, messages, chatHistory,
      addMessage, updateLastMessage, setMessages,
      startNewChat, loadChat, deleteChat, renameChat,
      runId, setRunId,
      runIds, setRunIds,
      orchestrationStatus, setOrchestrationStatus,
      nodeEvents, setNodeEvents,
      orchestrationResult, setOrchestrationResult,
      orchestrationResults, setOrchestrationResults,
      activePersonaKey, setActivePersonaKey,
      selectedPersonas, setSelectedPersonas,
      orchestrationError, setOrchestrationError,
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

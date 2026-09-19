"use client";

import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PERSONAS } from "@/lib/constants";

export default function Header() {
  const { persona, setPersona, theme, toggleTheme, toggleSidebar } = useApp();
  const pathname = usePathname();

  const getPageName = () => {
    if (pathname === "/") return "Home";
    if (pathname.startsWith("/autonomous")) return "Autonomous Module";
    if (pathname.startsWith("/interactive")) return "Interactive Module";
    if (pathname.startsWith("/data-management")) return "Data Management";
    if (pathname.startsWith("/observability")) return "AI Observability";
    if (pathname.startsWith("/rag-pipeline")) return "Context Enhancement Layer";
    return "Home";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--header-height)] border-b border-[var(--border-color)] flex items-center px-5 gap-4"
      style={{ boxShadow: "var(--shadow-sm)", background: "var(--hex-surface-1)" }}>
      {/* Hamburger Toggle */}
      <button
        onClick={toggleSidebar}
        className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border-color)] bg-[var(--hex-surface-2)] hover:bg-[var(--hex-surface-3)] transition-all cursor-pointer"
        title="Toggle sidebar"
      >
        <span className="material-icons-outlined text-[var(--hex-text-dim)]" style={{ fontSize: "18px" }}>menu</span>
      </button>
      {/* Logo + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-bold italic tracking-tight"
          style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          HEXAWARE
        </span>
        <div className="w-px h-5 bg-[var(--border-color)]" />
        <span className="text-sm font-semibold text-[var(--hex-text)] tracking-tight">
          Vibe Analytics
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--hex-accent)]/10 text-[var(--hex-accent)]">
          Demand Sensing
        </span>
        <span className="material-icons-outlined text-[var(--hex-text-muted)]" style={{ fontSize: "16px" }}>chevron_right</span>
        <span className="text-sm text-[var(--hex-text-dim)]">
          {getPageName()}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Persona Selector */}
      <div className="flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/150?img=32"
          alt={persona}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          style={{ border: "2px solid var(--hex-primary)", boxShadow: "0 1px 4px rgba(60,44,218,0.2)" }}
        />
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value as typeof persona)}
          className="text-xs font-medium bg-[var(--hex-surface-2)] text-[var(--hex-text)] border-none rounded-lg px-3 py-1.5 cursor-pointer outline-none appearance-none pr-6 hover:bg-[var(--hex-surface-3)] transition-colors"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          {PERSONAS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border-color)] bg-[var(--hex-surface-2)] hover:bg-[var(--hex-surface-3)] transition-all cursor-pointer"
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <span className="material-icons-outlined text-[var(--hex-text-dim)]" style={{ fontSize: "16px" }}>
          {theme === "light" ? "dark_mode" : "light_mode"}
        </span>
      </button>
    </header>
  );
}

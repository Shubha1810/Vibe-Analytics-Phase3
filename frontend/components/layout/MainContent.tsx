"use client";

import { useApp } from "@/context/AppContext";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useApp();

  return (
    <main
      className={`pt-[var(--header-height)] min-h-screen transition-all duration-300 ${
        sidebarOpen ? "pl-[var(--sidebar-width)]" : "pl-0"
      }`}
      style={{ background: "var(--hex-bg)" }}
    >
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}

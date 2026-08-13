"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useApp();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside className={cn(
      "fixed left-0 top-[var(--header-height)] bottom-0 w-[var(--sidebar-width)] border-r border-[var(--border-color)] flex flex-col z-40 overflow-y-auto transition-transform duration-300",
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    )}
      style={{ background: "linear-gradient(180deg, #3C2CDA 0%, #2A1FA0 100%)" }}>
      {/* Navigation */}
      <div className="px-4 pt-5 pb-2">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = !item.disabled && isActive(item.path);
            if (item.disabled) {
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/40 cursor-not-allowed"
                  title="Coming soon"
                >
                  <span className="material-icons-outlined" style={{ fontSize: "18px" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.path}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 no-underline group",
                  active
                    ? "bg-white/20 text-white shadow-md border border-white/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "material-icons-outlined transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : ""
                  )}
                  style={{ fontSize: "18px" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="px-4 py-5">
        <div className="relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-semibold text-white shadow-lg border border-white/20"
          style={{ background: "linear-gradient(135deg, #29B5E8 0%, #0D9DD9 50%, #3C2CDA 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 40%)" }} />
          <svg className="absolute top-1 right-2 opacity-[0.25]" width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 3v26M3 16h26M7 7l18 18M25 7L7 25" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="16" cy="6" r="1.5" fill="white"/><circle cx="16" cy="26" r="1.5" fill="white"/>
            <circle cx="6" cy="16" r="1.5" fill="white"/><circle cx="26" cy="16" r="1.5" fill="white"/>
            <circle cx="9" cy="9" r="1" fill="white"/><circle cx="23" cy="23" r="1" fill="white"/>
          </svg>
          <svg className="absolute bottom-1 left-2 opacity-[0.18]" width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M16 2v28M2 16h28M5.86 5.86l20.28 20.28M26.14 5.86L5.86 26.14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="16" cy="5" r="2" fill="white"/><circle cx="16" cy="27" r="2" fill="white"/>
          </svg>
          <svg className="absolute top-2 right-[45%] opacity-[0.15]" width="12" height="12" viewBox="0 0 32 32" fill="none">
            <path d="M16 2v28M2 16h28M5.86 5.86l20.28 20.28M26.14 5.86L5.86 26.14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="material-icons-outlined relative z-10" style={{ fontSize: "22px" }}>auto_awesome</span>
          <span className="relative z-10 leading-tight">Powered by<br/><span className="text-[14px] font-bold tracking-wide">Snowflake Cortex AI</span></span>
        </div>
      </div>
    </aside>
  );
}

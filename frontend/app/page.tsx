"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { MODULE_BULLETS } from "@/lib/constants";
import { useApp } from "@/context/AppContext";

const POST_AUTH_RELOAD_FLAG = "vibe-auth-reloaded";

export default function HomePage() {
  const { persona, setAuthenticated } = useApp();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);
  const hasReloadedAfterAuthRef = useRef(false);

  function openAuthPopup(url: string) {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    popupRef.current = window.open(
      url,
      "sf-auth",
      "width=600,height=720,menubar=no,toolbar=no"
    );
  }

  const checkAuth = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const response = await api.getAuth();

      if (response.status === "connected") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (popupRef.current && !popupRef.current.closed) {
          try { popupRef.current.close(); } catch {}
          popupRef.current = null;
        }
        setAuthenticated(true);
        setIsCheckingAuth(false);
        setAuthUrl(null);
        setAuthError(null);

        let alreadyReloaded = hasReloadedAfterAuthRef.current;
        if (typeof window !== "undefined") {
          try {
            alreadyReloaded =
              alreadyReloaded || window.sessionStorage.getItem(POST_AUTH_RELOAD_FLAG) === "1";
          } catch {}
        }
        if (!alreadyReloaded && typeof window !== "undefined") {
          hasReloadedAfterAuthRef.current = true;
          try { window.sessionStorage.setItem(POST_AUTH_RELOAD_FLAG, "1"); } catch {}
          window.location.reload();
        }
        return;
      } else if (response.status === "needs_auth" && response.auth_url) {
        setAuthUrl(response.auth_url);
        setIsCheckingAuth(false);
        hasReloadedAfterAuthRef.current = false;
        if (typeof window !== "undefined") {
          try { window.sessionStorage.removeItem(POST_AUTH_RELOAD_FLAG); } catch {}
        }
      } else if (response.status === "auth_error") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setAuthUrl(null);
        setAuthError(response.error || response.message || "Snowflake login timed out. Please retry sign-in.");
        setIsCheckingAuth(false);
        hasReloadedAfterAuthRef.current = false;
        if (typeof window !== "undefined") {
          try { window.sessionStorage.removeItem(POST_AUTH_RELOAD_FLAG); } catch {}
        }
      } else if (response.status === "initializing") {
        const restarted = response.message?.toLowerCase().includes("re-triggering")
          || response.message?.toLowerCase().includes("starting backend connection");
        if (restarted) {
          setAuthUrl(null);
        }
        setIsCheckingAuth(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to verify authentication");
      setIsCheckingAuth(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [setAuthenticated]);

  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    checkAuth();
    const cadence = authUrl ? 1500 : 3000;
    pollIntervalRef.current = setInterval(checkAuth, cadence);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [authUrl, checkAuth]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (data && typeof data === "object" && data.source === "sf-auth" && data.status === "connected") {
        checkAuth();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [checkAuth]);

  async function handleCheckNow() {
    setIsCheckingNow(true);
    try {
      await checkAuth();
    } finally {
      setIsCheckingNow(false);
    }
  }

  async function handleRestartAuth() {
    setAuthError(null);
    setAuthUrl(null);
    setIsCheckingAuth(true);
    hasReloadedAfterAuthRef.current = false;
    if (typeof window !== "undefined") {
      try { window.sessionStorage.removeItem(POST_AUTH_RELOAD_FLAG); } catch {}
    }
    try {
      await api.restartAuth();
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(checkAuth, 3000);
      }
      await checkAuth();
    } catch (err: any) {
      setAuthError(err.message || "Failed to restart Snowflake authentication");
      setIsCheckingAuth(false);
    }
  }

  const bullets = MODULE_BULLETS[persona];

  if (isCheckingAuth && !authUrl) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-pulse">
          <div className="mb-4 flex justify-center">
             <div className="w-10 h-10 border-4 border-[var(--hex-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[var(--hex-text-dim)] text-sm font-medium">Preparing Snowflake Connection...</p>
        </div>
      </div>
    );
  }

  if (authUrl) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-xl border border-slate-100 animate-fade-in">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="material-icons-outlined text-blue-600" style={{ fontSize: "32px" }}>open_in_new</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Sign in with Snowflake</h3>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            The secure Docker environment requires a manual sign-in trigger. Click below to authenticate in your browser.
          </p>
          <button
            type="button"
            onClick={() => openAuthPopup(authUrl)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg active:scale-[0.98] border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "20px" }}>lock</span>
            Open Login Screen
          </button>
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={isCheckingNow}
            className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-slate-700 text-sm font-medium transition-all hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            style={{ background: "transparent", border: "1px solid #e2e8f0" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "18px" }}>
              {isCheckingNow ? "hourglass_top" : "refresh"}
            </span>
            {isCheckingNow ? "Checking..." : "I've signed in - check now"}
          </button>
          <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
            If the login window stays open after sign-in, you can close it manually -
            this page will switch over automatically.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
             Waiting for credentials...
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl p-12 text-center max-w-md animate-fade-in" style={{ boxShadow: "var(--shadow-lg)" }}>
          <span className="material-icons-outlined text-red-500 mb-4 block" style={{ fontSize: "48px" }}>error_outline</span>
          <h3 className="text-lg font-semibold mb-2 text-slate-900">Authentication Error</h3>
          <p className="text-sm text-[var(--hex-text-dim)] mb-6 font-mono bg-slate-50 p-3 rounded text-left break-all">
            {authError}
          </p>
          <button
            type="button"
            onClick={handleRestartAuth}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 cursor-pointer border-none"
            style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
          >
            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Retry Snowflake Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pt-4">
      {/* Welcome heading */}
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-4 mb-3">
          <h1 className="text-3xl font-bold text-[var(--hex-primary)]">
            Welcome to Vibe Analytics
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: "linear-gradient(135deg, #06B6D4, #3C2CDA)" }}>
            Demand Sensing <span className="ml-1.5 font-normal text-[10px] tracking-widest">EDITION</span>
          </span>
        </div>
        <p className="text-sm text-[var(--hex-text-dim)]">
          Power of <span className="text-[var(--hex-primary)] font-semibold">AI-driven demand intelligence</span> for forecasting, inventory optimization, and signal detection
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[var(--border-color)] my-6" />

      {/* Module tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Autonomous Module */}
        <div className="relative">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))", boxShadow: "0 4px 16px rgba(60,44,218,0.25)" }}>
              <span className="material-icons-outlined text-white" style={{ fontSize: "28px" }}>precision_manufacturing</span>
            </div>
          </div>
          <Link href="/autonomous" className="block no-underline">
            <div className="rounded-2xl border-2 border-[var(--hex-primary)]/20 p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-[var(--hex-primary)]/40"
              style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.03), rgba(60,44,218,0.08))" }}>
              <h3 className="text-lg font-bold text-[var(--hex-text)] mb-3">Autonomous Module</h3>
              <p className="text-[13px] text-[var(--hex-text-dim)] leading-relaxed mb-4">
                Automatically generates comprehensive demand intelligence reports by analyzing forecast accuracy,
                demand signals, and inventory health across regions and SKUs.
              </p>
              <ul className="space-y-2">
                {bullets.autonomous.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--hex-text-dim)]">
                    <span className="text-[var(--hex-primary)] mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        </div>

        {/* Interactive Module */}
        <div className="relative">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))", boxShadow: "0 4px 16px rgba(60,44,218,0.25)" }}>
              <span className="material-icons-outlined text-white" style={{ fontSize: "28px" }}>forum</span>
            </div>
          </div>
          <Link href="/interactive" className="block no-underline">
            <div className="rounded-2xl border-2 border-[var(--hex-primary)]/20 p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-[var(--hex-primary)]/40"
              style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.03), rgba(60,44,218,0.08))" }}>
              <h3 className="text-lg font-bold text-[var(--hex-text)] mb-3">Interactive Module</h3>
              <p className="text-[13px] text-[var(--hex-text-dim)] leading-relaxed mb-4">
                Engage with AI-powered demand analysis that surfaces forecast trends, anomaly detection,
                and responds to follow-up questions with relevant visualizations and recommendations.
              </p>
              <ul className="space-y-2">
                {bullets.interactive.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--hex-text-dim)]">
                    <span className="text-[var(--hex-primary)] mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

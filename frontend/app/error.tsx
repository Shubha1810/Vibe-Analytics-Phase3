"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl p-12 text-center max-w-md animate-fade-in" style={{ boxShadow: "var(--shadow-lg)" }}>
        <span className="material-icons-outlined text-[var(--hex-error)] mb-4 block" style={{ fontSize: "48px" }}>error_outline</span>
        <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
        <p className="text-sm text-[var(--hex-text-dim)] mb-4">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 cursor-pointer border-none"
          style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
        >
          <span className="material-icons-outlined" style={{ fontSize: "16px" }}>refresh</span>
          Try Again
        </button>
      </div>
    </div>
  );
}

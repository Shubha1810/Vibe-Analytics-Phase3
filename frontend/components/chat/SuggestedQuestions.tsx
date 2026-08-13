"use client";

interface Props {
  suggestions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ suggestions, onSelect }: Props) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-[var(--hex-primary)]/20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--hex-primary)]/5 border-b border-[var(--hex-primary)]/10">
        <span className="material-icons-outlined" style={{ fontSize: "18px", color: "var(--hex-primary)" }}>lightbulb</span>
        <span className="text-[13px] font-semibold text-[var(--hex-primary)]">
          Suggested Next Steps
        </span>
      </div>
      {/* Suggestions */}
      <div className="bg-[var(--hex-primary)]/[0.02]">
        {suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-[var(--hex-text)] cursor-pointer border-none bg-transparent transition-all hover:bg-[var(--hex-primary)]/5 group"
            style={i < suggestions.length - 1 ? { borderBottom: "1px solid var(--border-color)" } : {}}
          >
            <span className="text-[var(--hex-primary)] font-medium text-[14px] flex-shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
            <span className="group-hover:text-[var(--hex-primary)] transition-colors">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type RagDocument, type RagDocumentFull } from "@/lib/api";

const CATEGORIES = [
  { id: "all", label: "All", icon: "folder" },
  { id: "SOP", label: "SOPs", icon: "assignment" },
  { id: "CONTRACT", label: "Contracts", icon: "handshake" },
  { id: "POLICY", label: "Policies", icon: "policy" },
  { id: "RESEARCH", label: "Research", icon: "science" },
];

export default function RagPipelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const [searching, setSearching] = useState(false);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<RagDocumentFull | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [view, setView] = useState<"search" | "browse">("search");

  const loadDocuments = useCallback(async (category?: string) => {
    setLoadingDocs(true);
    try {
      const data = await api.ragGetDocuments(category);
      setDocuments(data.documents);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments(activeCategory);
  }, [activeCategory, loadDocuments]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await api.ragSearch(searchQuery, activeCategory !== "all" ? activeCategory : undefined);
      const results = data.results;
      if (Array.isArray(results)) {
        setSearchResults(results);
      } else if (results && typeof results === "object" && "results" in (results as Record<string, unknown>)) {
        setSearchResults((results as Record<string, unknown[]>).results || []);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openDocument = async (docId: string) => {
    setLoadingDoc(true);
    try {
      const doc = await api.ragGetDocument(docId);
      setSelectedDoc(doc);
    } catch {
      setSelectedDoc(null);
    } finally {
      setLoadingDoc(false);
    }
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "SOP": return "#3C2CDA";
      case "CONTRACT": return "#00B894";
      case "POLICY": return "#F59E0B";
      case "RESEARCH": return "#06B6D4";
      default: return "#64748b";
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-var(--header-height)-48px)] animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 30%, #00B894 70%, #80d8ff 100%)",
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
              <span className="material-icons-outlined text-white" style={{ fontSize: "22px" }}>model_training</span>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-0.5 tracking-tight">RAG Pipeline</h2>
              <p className="text-white/60 text-[11px] m-0">
                Cortex Search — Knowledge Base for Demand Sensing Intelligence
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("search")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none transition-all ${view === "search" ? "bg-white/25 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
            >
              <span className="material-icons-outlined" style={{ fontSize: "14px" }}>search</span>
              Search
            </button>
            <button
              onClick={() => setView("browse")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none transition-all ${view === "browse" ? "bg-white/25 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
            >
              <span className="material-icons-outlined" style={{ fontSize: "14px" }}>library_books</span>
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium cursor-pointer border transition-all ${
              activeCategory === cat.id
                ? "bg-[var(--hex-primary)]/10 border-[var(--hex-primary)]/30 text-[var(--hex-primary)]"
                : "bg-white border-[var(--border-color)] text-[var(--hex-text-dim)] hover:border-[var(--hex-primary)]/20"
            }`}
          >
            <span className="material-icons-outlined" style={{ fontSize: "15px" }}>{cat.icon}</span>
            {cat.label}
            {!loadingDocs && (
              <span className="text-[10px] opacity-60">
                ({cat.id === "all" ? documents.length : documents.filter(d => d.CATEGORY === cat.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left Panel - Search/Browse */}
        <div className="flex-1 flex flex-col min-w-0">
          {view === "search" && (
            <>
              {/* Search Input */}
              <div className="rounded-2xl border border-[var(--border-color)] bg-white p-3 flex items-center gap-3 mb-3 flex-shrink-0"
                style={{ boxShadow: "var(--shadow-sm)" }}>
                <span className="material-icons-outlined text-[var(--hex-text-muted)]" style={{ fontSize: "20px" }}>search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  placeholder="Search knowledge base — SOPs, policies, contracts, research..."
                  className="flex-1 text-[13px] text-[var(--hex-text)] placeholder:text-[var(--hex-text-muted)] outline-none border-none bg-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--hex-primary), var(--hex-primary-light))" }}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-white p-4"
                style={{ boxShadow: "var(--shadow-sm)" }}>
                {searchResults.length === 0 && !searching && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.08), rgba(0,184,148,0.08))" }}>
                      <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "32px" }}>manage_search</span>
                    </div>
                    <p className="text-[13px] font-medium text-[var(--hex-text)] mb-1">Cortex Search RAG Pipeline</p>
                    <p className="text-[11px] text-[var(--hex-text-muted)] max-w-sm">
                      Search across 30 SME-grade documents: SOPs, supplier contracts, governance policies, and research notes powering the Demand Sensing agent.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
                      {["What is the stockout replenishment process?", "Supplier lead times for fresh produce", "AI recommendation confidence policy"].map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setSearchQuery(q); }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] text-[var(--hex-text-dim)] border border-[var(--border-color)] bg-[var(--hex-surface-1)] hover:bg-[var(--hex-primary)]/5 hover:border-[var(--hex-primary)]/20 transition-all cursor-pointer"
                        >
                          <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "14px" }}>arrow_forward</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searching && (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--hex-text-muted)]">
                      <span className="spinner spinner-sm" />
                      Searching Cortex Search service...
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-[var(--hex-text-muted)] font-medium mb-2">
                      {searchResults.length} result(s) for &quot;{searchQuery}&quot;
                    </div>
                    {searchResults.map((result: unknown, i: number) => {
                      const r = result as Record<string, unknown>;
                      const content = String(r.CONTENT || r.content || "");
                      const title = String(r.TITLE || r.title || `Result ${i + 1}`);
                      const category = String(r.CATEGORY || r.category || "");
                      const docId = String(r.DOC_ID || r.doc_id || "");
                      return (
                        <div
                          key={i}
                          className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--hex-primary)]/30 transition-all cursor-pointer group"
                          onClick={() => docId && openDocument(docId)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${categoryColor(category)}15` }}>
                              <span className="material-icons-outlined" style={{ fontSize: "16px", color: categoryColor(category) }}>
                                {category === "SOP" ? "assignment" : category === "CONTRACT" ? "handshake" : category === "POLICY" ? "policy" : "science"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[12px] font-semibold text-[var(--hex-text)] group-hover:text-[var(--hex-primary)] transition-colors">{title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: `${categoryColor(category)}15`, color: categoryColor(category) }}>
                                  {category}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--hex-text-dim)] line-clamp-3 m-0">
                                {content.slice(0, 300)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {view === "browse" && (
            <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-white p-4"
              style={{ boxShadow: "var(--shadow-sm)" }}>
              {loadingDocs ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--hex-text-muted)]">
                    <span className="spinner spinner-sm" />
                    Loading knowledge base...
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--hex-text-muted)] font-medium mb-3">
                    {documents.length} document(s) in knowledge base
                  </div>
                  {documents.map((doc) => (
                    <div
                      key={doc.DOC_ID}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--hex-primary)]/30 hover:bg-[var(--hex-surface-1)] transition-all cursor-pointer group"
                      onClick={() => openDocument(doc.DOC_ID)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${categoryColor(doc.CATEGORY)}15` }}>
                        <span className="material-icons-outlined" style={{ fontSize: "16px", color: categoryColor(doc.CATEGORY) }}>
                          {doc.CATEGORY === "SOP" ? "assignment" : doc.CATEGORY === "CONTRACT" ? "handshake" : doc.CATEGORY === "POLICY" ? "policy" : "science"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[var(--hex-text)] group-hover:text-[var(--hex-primary)] transition-colors truncate">
                          {doc.TITLE}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: `${categoryColor(doc.CATEGORY)}15`, color: categoryColor(doc.CATEGORY) }}>
                            {doc.CATEGORY}
                          </span>
                          <span className="text-[10px] text-[var(--hex-text-muted)]">{doc.DEPARTMENT}</span>
                          <span className="text-[10px] text-[var(--hex-text-muted)]">v{doc.VERSION}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-[var(--hex-text-muted)] flex-shrink-0">
                        {Math.round(doc.CONTENT_LENGTH / 1024)}KB
                      </div>
                      <span className="material-icons-outlined text-[var(--hex-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: "16px" }}>
                        chevron_right
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Document Viewer */}
        <div className="w-[420px] flex-shrink-0 rounded-2xl border border-[var(--border-color)] bg-white overflow-hidden flex flex-col"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          {!selectedDoc && !loadingDoc && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(60,44,218,0.08)" }}>
                <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "24px" }}>description</span>
              </div>
              <p className="text-[12px] font-medium text-[var(--hex-text)] mb-1">Document Viewer</p>
              <p className="text-[11px] text-[var(--hex-text-muted)]">
                Select a document to view its full content
              </p>
            </div>
          )}

          {loadingDoc && (
            <div className="flex-1 flex items-center justify-center">
              <span className="spinner spinner-sm" />
            </div>
          )}

          {selectedDoc && !loadingDoc && (
            <>
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--hex-surface-1)] flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${categoryColor(selectedDoc.CATEGORY)}15`, color: categoryColor(selectedDoc.CATEGORY) }}>
                        {selectedDoc.CATEGORY}
                      </span>
                      <span className="text-[10px] text-[var(--hex-text-muted)]">{selectedDoc.DOC_ID}</span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-[var(--hex-text)] m-0 leading-snug">
                      {selectedDoc.TITLE}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--hex-text-muted)]">
                      <span>Dept: {selectedDoc.DEPARTMENT}</span>
                      <span>v{selectedDoc.VERSION}</span>
                    </div>
                    {selectedDoc.TAGS && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedDoc.TAGS.split(",").map((tag, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--hex-surface-2)] text-[var(--hex-text-dim)]">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--hex-text-muted)] hover:text-[var(--hex-text)] hover:bg-[var(--hex-surface-2)] cursor-pointer border-none bg-transparent transition-all flex-shrink-0"
                  >
                    <span className="material-icons-outlined" style={{ fontSize: "16px" }}>close</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-[11px] text-[var(--hex-text-dim)] whitespace-pre-wrap font-[inherit] m-0 leading-relaxed">
                  {selectedDoc.CONTENT}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-white flex-shrink-0"
        style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-2">
          <span className="material-icons-outlined text-[var(--hex-primary)]" style={{ fontSize: "16px" }}>storage</span>
          <span className="text-[11px] text-[var(--hex-text-dim)]">
            <strong className="text-[var(--hex-text)]">30</strong> documents indexed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-outlined text-[#00B894]" style={{ fontSize: "16px" }}>cloud_done</span>
          <span className="text-[11px] text-[var(--hex-text-dim)]">
            Cortex Search: <strong className="text-[#00B894]">Active</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-outlined text-[#F59E0B]" style={{ fontSize: "16px" }}>update</span>
          <span className="text-[11px] text-[var(--hex-text-dim)]">
            Target lag: <strong className="text-[var(--hex-text)]">1 hour</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-outlined text-[#06B6D4]" style={{ fontSize: "16px" }}>hub</span>
          <span className="text-[11px] text-[var(--hex-text-dim)]">
            Service: <strong className="text-[var(--hex-text)]">DEMAND_SENSING_RAG_SEARCH</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

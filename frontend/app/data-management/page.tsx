"use client";

import { useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";

const DATA_SOURCES = [
  { id: "postgres", label: "Postgres", icon: "storage" },
  { id: "bigquery", label: "BigQuery", icon: "cloud" },
  { id: "mcp", label: "MCP Server", icon: "dns" },
  { id: "custom", label: "Custom Data\n(via upload)", icon: "upload_file" },
  { id: "onedrive", label: "OneDrive", icon: "cloud_queue" },
  { id: "azure", label: "Azure ADLS", icon: "cloud_circle" },
  { id: "snowflake", label: "Snowflake", icon: "ac_unit" },
  { id: "databricks", label: "Databricks", icon: "hub" },
  { id: "gdrive", label: "Google Drive", icon: "add_to_drive" },
];

const PERSONA_CATALOG: Record<string, { database: string; schema: string; table: string }> = {
  "Demand Analyst": {
    database: "DEMANDSENSING_AI",
    schema: "PUBLIC",
    table: "DEMAND_FORECAST_V1",
  },
};

const PERSONA_FILES: Record<string, { name: string; database: string; schema: string; rows: number; size: string; status: string }[]> = {
  "Demand Analyst": [
    { name: "DEMAND_FORECAST_V1", database: "DEMANDSENSING_AI", schema: "PUBLIC", rows: 0, size: "—", status: "Pending" },
    { name: "INVENTORY_HEALTH_V1", database: "DEMANDSENSING_AI", schema: "PUBLIC", rows: 0, size: "—", status: "Pending" },
    { name: "DEMAND_SIGNALS_V1", database: "DEMANDSENSING_AI", schema: "PUBLIC", rows: 0, size: "—", status: "Pending" },
  ],
};

export default function DataManagementPage() {
  const { persona } = useApp();
  const [showModal, setShowModal] = useState(false);
  const catalog = PERSONA_CATALOG[persona] || PERSONA_CATALOG["Demand Analyst"];

  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ uploaded: string[]; errors: { file: string; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  }, []);

  const removeFile = useCallback((idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload-csv", { method: "POST", body: formData });
      const data = await res.json();
      setUploadResult(data);
      if (data.uploaded?.length > 0) setSelectedFiles([]);
    } catch {
      setUploadResult({ uploaded: [], errors: [{ file: "", error: "Upload failed. Please try again." }] });
    }
    setUploading(false);
  }, [selectedFiles]);

  return (
    <div className="p-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #3C2CDA 30%, #42a5f5 70%, #80d8ff 100%)",
          boxShadow: "0 4px 20px rgba(26,35,126,0.35)",
        }}>
        <div className="absolute top-0 left-12 w-24 h-full opacity-[0.14]"
          style={{ background: "repeating-linear-gradient(60deg, white 0px, white 2px, transparent 2px, transparent 14px)" }} />
        <div className="absolute -top-4 -left-4 w-20 h-20 opacity-[0.16]"
          style={{ background: "white", transform: "rotate(45deg)", borderRadius: "6px" }} />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <span className="material-icons-outlined text-white" style={{ fontSize: "22px" }}>storage</span>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-0.5 tracking-tight">Data Management</h2>
            <p className="text-white/60 text-[11px] m-0">Manage your data sources and connections</p>
          </div>
        </div>
      </div>

      {/* Section: Connect to a data source */}
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "18px" }}>link</span>
        Connect to a data source
      </h3>

      <div className="grid grid-cols-5 gap-3">
        {DATA_SOURCES.map((source) => {
          const isSnowflake = source.id === "snowflake";
          return (
            <div
              key={source.id}
              onClick={isSnowflake ? () => setShowModal(true) : undefined}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 transition-all duration-200 ${
                isSnowflake
                  ? "border-[#29B5E8] bg-white shadow-lg shadow-[#29B5E8]/20 cursor-pointer hover:shadow-xl hover:shadow-[#29B5E8]/30 hover:scale-[1.02]"
                  : "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
              }`}
            >
              {isSnowflake && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#29B5E8] flex items-center justify-center">
                  <span className="material-icons-outlined text-white" style={{ fontSize: "14px" }}>check</span>
                </div>
              )}
              <span className={`material-icons-outlined ${isSnowflake ? "text-[#29B5E8]" : "text-gray-400"}`} style={{ fontSize: "32px" }}>{source.icon}</span>
              <span className={`text-[11px] text-center font-medium whitespace-pre-line leading-tight ${isSnowflake ? "text-[#0D9DD9] font-semibold" : "text-gray-400"}`}>
                {source.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Section: Upload Custom Data */}
      <h3 className="text-sm font-bold text-gray-800 mt-6 mb-2 flex items-center gap-2">
        <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "18px" }}>cloud_upload</span>
        Upload Custom Data
      </h3>
      <p className="text-xs text-gray-500 mb-3">Upload up to 5 CSV files to provide context for AI-powered insights and recommendations.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 p-5 flex items-center justify-between ${
          dragOver
            ? "border-[#3C2CDA] bg-[#EEF2FF] shadow-lg shadow-[#3C2CDA]/10"
            : "border-gray-300 bg-gradient-to-r from-[#F8FAFF] to-[#F0F4FF] hover:border-[#29B5E8] hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-icons-outlined transition-transform duration-200 ${dragOver ? "text-[#3C2CDA] scale-110" : "text-[#29B5E8]"}`} style={{ fontSize: "36px" }}>cloud_upload</span>
          <div>
            <p className="text-sm font-semibold text-gray-700 m-0">Drag and drop files here</p>
            <p className="text-xs text-gray-400 m-0 mt-0.5">Limit 200MB per file &bull; CSV</p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#3C2CDA]/30 text-[#3C2CDA] bg-white hover:bg-[#EEF2FF] transition-colors"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-[#29B5E8]" style={{ fontSize: "18px" }}>description</span>
                <span className="text-sm text-gray-700 font-medium">{f.name}</span>
                <span className="text-xs text-gray-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer">
                <span className="material-icons-outlined" style={{ fontSize: "18px" }}>close</span>
              </button>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, #29B5E8, #3C2CDA)" }}
          >
            {uploading ? "Uploading..." : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} to Snowflake`}
          </button>
        </div>
      )}

      {uploadResult && (
        <div className="mt-3">
          {uploadResult.uploaded.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              <span className="material-icons-outlined" style={{ fontSize: "18px" }}>check_circle</span>
              Successfully uploaded: {uploadResult.uploaded.join(", ")}
            </div>
          )}
          {uploadResult.errors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mt-2">
              <span className="material-icons-outlined" style={{ fontSize: "18px" }}>error</span>
              {uploadResult.errors.map((e) => e.error).join("; ")}
            </div>
          )}
        </div>
      )}

      {/* Section: Files in Agentic Memory */}
      <h3 className="text-sm font-bold text-gray-800 mt-6 mb-2 flex items-center gap-2">
        <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "18px" }}>folder_open</span>
        Files in Agentic Memory
      </h3>
      <p className="text-xs text-gray-500 mb-3">Files persist during your session. Add them to Agentic Memory to make them available for analysis in both modules.</p>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {(PERSONA_FILES[persona] || []).map((file, i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="material-icons-outlined text-amber-500" style={{ fontSize: "18px" }}>pending</span>
              <span className="material-icons-outlined text-[#29B5E8]" style={{ fontSize: "18px" }}>description</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{file.name}</div>
                <div className="text-[10px] text-gray-400 font-mono truncate">{file.database}.{file.schema}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-gray-600 font-medium">{file.rows > 0 ? file.rows.toLocaleString() + " rows" : "—"}</span>
              <span className="text-xs text-gray-400">{file.size}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                <span className="material-icons-outlined" style={{ fontSize: "12px" }}>hourglass_top</span>
                {file.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
        <span className="material-icons-outlined" style={{ fontSize: "14px" }}>memory</span>
        <span><strong>Agentic Memory:</strong> {(PERSONA_FILES[persona] || []).length} file(s) configured — tables will be populated when backend is connected</span>
      </div>

      {/* Snowflake Horizon Catalog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-200 shadow-sm">
                <span className="material-icons-outlined text-[#29B5E8]" style={{ fontSize: "28px" }}>ac_unit</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 m-0">Snowflake Horizon Catalog</h3>
                <p className="text-xs text-gray-500 m-0 mt-0.5">Active data source for {persona}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F0F9FF] to-[#EEF2FF] rounded-xl p-5 border border-[#29B5E8]/20 mb-6">
              <div className="text-[10px] uppercase font-semibold text-[#0D9DD9] tracking-wider mb-3">Catalog Path</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#29B5E8]/30 text-sm font-mono font-semibold text-gray-800 shadow-sm">
                  <span className="material-icons-outlined text-[#29B5E8]" style={{ fontSize: "14px" }}>database</span>
                  {catalog.database}
                </span>
                <span className="text-gray-300 font-bold text-lg">&rarr;</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#29B5E8]/30 text-sm font-mono font-semibold text-gray-800 shadow-sm">
                  <span className="material-icons-outlined text-[#29B5E8]" style={{ fontSize: "14px" }}>schema</span>
                  {catalog.schema}
                </span>
                <span className="text-gray-300 font-bold text-lg">&rarr;</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#3C2CDA]/30 text-sm font-mono font-semibold text-[#3C2CDA] shadow-sm">
                  <span className="material-icons-outlined text-[#3C2CDA]" style={{ fontSize: "14px" }}>table_chart</span>
                  {catalog.table}
                </span>
              </div>
            </div>

            <div className="block bg-gray-900 rounded-lg px-4 py-3 mb-6 font-mono text-sm text-green-400 overflow-x-auto">
              <span className="text-gray-500">snowflake://</span>{catalog.database}<span className="text-gray-500">.</span>{catalog.schema}<span className="text-gray-500">.</span>{catalog.table}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 border-none cursor-pointer"
                style={{ background: "linear-gradient(135deg, #29B5E8, #3C2CDA)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

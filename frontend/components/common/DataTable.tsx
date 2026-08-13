"use client";

import { formatCell } from "@/lib/utils";

interface Props {
  columns: string[];
  rows: unknown[][];
  maxRows?: number;
}

export default function DataTable({ columns, rows, maxRows = 50 }: Props) {
  const displayRows = rows.slice(0, maxRows);

  const handleDownloadCSV = () => {
    const header = columns.join(",");
    const csvRows = rows.map((row) =>
      row.map((cell) => {
        const val = String(cell ?? "");
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 rounded-xl border border-[var(--border-color)] overflow-hidden animate-fade-in max-w-full"
      style={{ boxShadow: "0 2px 8px rgba(60,44,218,0.06)" }}>
      {/* Table header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]"
        style={{ background: "linear-gradient(135deg, rgba(60,44,218,0.05), rgba(0,184,148,0.03))" }}>
        <div className="flex items-center gap-2 text-[11px] text-[var(--hex-text-dim)]">
          <span className="material-icons-outlined" style={{ fontSize: "14px", color: "var(--hex-primary)" }}>table_chart</span>
          <span className="font-medium">{rows.length} rows × {columns.length} columns</span>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[var(--hex-primary)] text-white border-none cursor-pointer hover:opacity-90 transition-all"
        >
          <span className="material-icons-outlined" style={{ fontSize: "12px" }}>download</span>
          CSV
        </button>
      </div>
      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 font-semibold text-white whitespace-nowrap sticky top-0"
                  style={{ background: "linear-gradient(135deg, #3C2CDA, #5B4BE6)" }}
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr
                key={ri}
                className={`transition-colors hover:bg-[var(--hex-primary)]/5 ${
                  ri % 2 === 0 ? "bg-white" : "bg-[var(--hex-surface-2)]/50"
                }`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 border-b border-[var(--border-color)]/50 whitespace-nowrap ${
                      ci === 0 ? "font-medium text-[var(--hex-text)]" : "text-[var(--hex-text-dim)]"
                    }`}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <div className="px-4 py-2 text-[10px] text-[var(--hex-text-muted)] bg-[var(--hex-surface-2)] border-t border-[var(--border-color)] flex items-center justify-between">
          <span>Showing {maxRows} of {rows.length} rows</span>
          <span className="text-[var(--hex-primary)] font-medium">Download CSV for full data</span>
        </div>
      )}
    </div>
  );
}

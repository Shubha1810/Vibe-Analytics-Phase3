export function formatNumber(n: number): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  if (n % 1 !== 0) return n.toFixed(2);
  return n.toLocaleString();
}

export function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (v % 1 !== 0) return v.toFixed(4);
  }
  return String(v);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

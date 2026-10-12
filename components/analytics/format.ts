const nf1 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Persentase untuk tampilan. null = belum ada data (bukan 0%, bukan NaN). */
export const fmtPct = (v: number | null | undefined, empty = "Belum ada data") =>
  v === null || v === undefined || !Number.isFinite(v) ? empty : `${nf1.format(v)}%`;
export const fmtNum = (v: number | null | undefined, empty = "—") => (v === null || v === undefined || !Number.isFinite(v) ? empty : nf1.format(v));
export const fmtInt = (v: number | null | undefined, empty = "—") => (v === null || v === undefined || !Number.isFinite(v) ? empty : nf0.format(v));
export const fmtDelta = (v: number | null, unit: "poin" | "persen") =>
  v === null || !Number.isFinite(v) ? "—" : `${v > 0 ? "▲ +" : v < 0 ? "▼ " : "■ "}${nf1.format(v)}${unit === "persen" ? "%" : " poin"}`;

/** Warna seri yang konsisten antar grafik; selalu dipasangkan dengan label teks. */
export const SERIES = ["#3457ff", "#ff6b35", "#c9b8ff", "#d7ff38", "#2fb5a8", "#f2c14e", "#e0457b", "#7a8cff"];
export const COLOR_OK = "#2fb5a8";
export const COLOR_BAD = "#ff6b35";
export const COLOR_NEUTRAL = "#3457ff";
export const COLOR_BLANK = "#9aa0a6";

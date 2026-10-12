// Filter dashboard analitik. Semua komponen (kartu, grafik, tabel, ekspor) memakai objek yang sama.
export type Attempt = "semua" | "pertama" | "terakhir";
export type StatusScope = "valid" | "received" | "flagged" | "spam";
export type Interval = "hari" | "minggu" | "bulan";

export type AnalyticsFilters = {
  from: string; // YYYY-MM-DD, zona WIB
  to: string;
  group: string; // id kolom pengelompok (kelas). "" = deteksi otomatis
  cls: string; // kunci kelompok yang dipilih. "" = semua
  attempt: Attempt;
  status: StatusScope;
  person: string;
  smin: number | null; // rentang nilai 0–100
  smax: number | null;
  pass: number; // nilai kelulusan (KKM)
  interval: Interval;
  hard: number; // < hard % benar = sulit
  easy: number; // >= easy % benar = mudah
  bins: number[]; // batas rentang histogram, naik, dari 0 sampai 100
  soal: string; // id soal yang dibuka di panel detail
};

export const DEFAULT_BINS = [0, 50, 60, 70, 80, 90, 100];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const int = (v: string, lo: number, hi: number): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

export function parseBins(raw: string): number[] {
  const nums = raw.split(",").map((x) => Number(x.trim()));
  const ok =
    nums.length >= 2 &&
    nums.length <= 12 &&
    nums.every((n, i) => Number.isInteger(n) && n >= 0 && n <= 100 && (i === 0 || n > nums[i - 1])) &&
    nums[0] === 0 &&
    nums[nums.length - 1] === 100;
  return ok ? nums : DEFAULT_BINS;
}

export function parseAnalyticsFilters(sp: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const from = one(sp.from);
  const to = one(sp.to);
  const attempt = one(sp.percobaan);
  const status = one(sp.status);
  const interval = one(sp.interval);
  let hard = int(one(sp.sulit), 1, 100) ?? 40;
  let easy = int(one(sp.mudah), 1, 100) ?? 70;
  if (hard >= easy) {
    hard = 40;
    easy = 70;
  }
  return {
    from: DATE.test(from) ? from : "",
    to: DATE.test(to) ? to : "",
    group: ID.test(one(sp.group)) ? one(sp.group) : "",
    cls: one(sp.kelas).trim().slice(0, 100),
    attempt: attempt === "pertama" || attempt === "terakhir" ? attempt : "semua",
    status: status === "received" || status === "flagged" || status === "spam" ? status : "valid",
    person: one(sp.peserta).trim().slice(0, 100),
    smin: int(one(sp.smin), 0, 100),
    smax: int(one(sp.smax), 0, 100),
    pass: int(one(sp.lulus), 0, 100) ?? 70,
    interval: interval === "minggu" || interval === "bulan" ? interval : "hari",
    hard,
    easy,
    bins: parseBins(one(sp.bins)),
    soal: ID.test(one(sp.soal)) ? one(sp.soal) : "",
  };
}

/** Query string yang hanya memuat nilai non-default. `omit` dipakai mis. untuk menautkan soal lain. */
export function filtersToQs(f: AnalyticsFilters, omit: string[] = []): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | null, def: string | number | null = "") => {
    if (omit.includes(k) || v === null || v === def) return;
    p.set(k, String(v));
  };
  set("from", f.from);
  set("to", f.to);
  set("group", f.group);
  set("kelas", f.cls);
  set("percobaan", f.attempt, "semua");
  set("status", f.status, "valid");
  set("peserta", f.person);
  set("smin", f.smin, null);
  set("smax", f.smax, null);
  set("lulus", f.pass, 70);
  set("interval", f.interval, "hari");
  set("sulit", f.hard, 40);
  set("mudah", f.easy, 70);
  if (f.bins.join(",") !== DEFAULT_BINS.join(",")) set("bins", f.bins.join(","));
  set("soal", f.soal);
  return p.toString();
}

/** Ringkasan teks filter aktif, ditampilkan agar jelas cakupan datanya. */
export function describeFilters(f: AnalyticsFilters, groupLabel: string | null): string[] {
  const out: string[] = [];
  if (f.from || f.to) out.push(`Tanggal ${f.from || "…"} s.d. ${f.to || "…"} (WIB)`);
  if (f.cls) out.push(`${groupLabel ?? "Kelompok"}: ${f.cls}`);
  if (f.attempt !== "semua") out.push(`Hanya percobaan ${f.attempt}`);
  if (f.status !== "valid") out.push(`Status: ${f.status}`);
  if (f.person) out.push(`Peserta: “${f.person}”`);
  if (f.smin !== null || f.smax !== null) out.push(`Nilai ${f.smin ?? 0}–${f.smax ?? 100}`);
  return out;
}

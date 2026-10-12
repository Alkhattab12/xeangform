import { hasAnswerKey, isInputType, type FormField } from "@/lib/forms/schema";
import type { ResponseMeta } from "@/lib/forms/answers";
import type { AnalyticsFilters } from "./filters";

/*
 * Definisi unit (satu sumber kebenaran untuk seluruh dashboard):
 *  - Respons / percobaan selesai : satu baris form_submissions (aplikasi tidak menyimpan percobaan yang belum selesai).
 *  - Peserta unik                : respondent_id (akun) atau email akun; respons anonim tidak bisa dihitung unik.
 *  - Nilai respons               : benar / jumlah soal berkunci × 100. Soal kosong menyumbang 0
 *                                  (sama dengan penilaian saat pengiriman, lihat lib/forms/grade.ts). Semua soal berbobot sama.
 *  - Akurasi                     : benar / (benar + salah). Soal kosong TIDAK ikut penyebut; dilaporkan terpisah.
 *  - Nilai dihitung ulang dari kunci jawaban form saat ini, bukan dari metadata_json.score (bisa kosong/usang).
 */

export type RawSubmission = {
  id: string;
  submitted_at: string;
  status: string;
  answers: Record<string, unknown>;
  respondentId: string | null;
  meta: ResponseMeta;
};

export type CellStatus = "correct" | "wrong" | "blank" | "na";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function isAnswered(f: FormField, a: unknown): boolean {
  switch (f.type) {
    case "radio":
    case "dropdown":
      return isObj(a) && ((typeof a.optionId === "string" && a.optionId !== "") || (typeof a.other === "string" && a.other !== ""));
    case "checkbox":
      return isObj(a) && (strs(a.optionIds).length > 0 || (typeof a.other === "string" && a.other !== ""));
    case "number":
    case "linear_scale":
    case "rating":
      return typeof a === "number" && Number.isFinite(a);
    case "consent":
      return a === true;
    case "file":
      return false;
    default:
      return typeof a === "string" && a.trim() !== "";
  }
}

/** Aturan sama dengan gradeQuiz, tetapi membedakan benar / salah / kosong. */
export function gradeCell(f: FormField, a: unknown): CellStatus {
  if (!hasAnswerKey(f)) return "na";
  if (!isAnswered(f, a)) return "blank";
  const k = f.answerKey ?? {};
  switch (f.type) {
    case "radio":
    case "dropdown":
      return isObj(a) && typeof a.optionId === "string" && a.optionId === (k.optionIds ?? [])[0] ? "correct" : "wrong";
    case "checkbox": {
      const o = isObj(a) ? a : {};
      const got = strs(o.optionIds);
      const want = k.optionIds ?? [];
      const hasOther = typeof o.other === "string" && o.other !== "";
      return !hasOther && got.length === want.length && want.every((id) => got.includes(id)) ? "correct" : "wrong";
    }
    case "short_text":
      return typeof a === "string" && (k.text ?? []).some((t) => norm(t) === norm(a)) ? "correct" : "wrong";
    case "number":
      return typeof a === "number" && typeof k.number === "number" && Math.abs(a - k.number) < 1e-9 ? "correct" : "wrong";
    default:
      return "na";
  }
}

// ---------------- Kelompok (kelas) ----------------
export const GROUP_TYPES = new Set(["radio", "dropdown", "short_text"]);
export const groupCandidates = (fields: FormField[]) => fields.filter((f) => GROUP_TYPES.has(f.type));
export function detectGroupField(fields: FormField[]): FormField | null {
  return groupCandidates(fields).find((f) => /\b(kelas|class|rombel)\b/i.test(f.label)) ?? null;
}
const NO_GROUP = "(Tanpa jawaban)";

function groupOf(f: FormField | null, a: unknown): { key: string; label: string } {
  if (!f) return { key: "", label: "" };
  if (f.type === "short_text") {
    const s = typeof a === "string" ? a.trim().replace(/\s+/g, " ") : "";
    return s ? { key: s.toLowerCase(), label: s } : { key: "", label: NO_GROUP };
  }
  if (isObj(a)) {
    if (typeof a.optionId === "string" && a.optionId) {
      const o = f.options?.find((x) => x.id === a.optionId);
      return { key: `o:${a.optionId}`, label: o ? o.label : "(opsi sudah dihapus)" };
    }
    if (typeof a.other === "string" && a.other.trim()) return { key: `x:${a.other.trim().toLowerCase()}`, label: a.other.trim() };
  }
  return { key: "", label: NO_GROUP };
}

// ---------------- Waktu (WIB) ----------------
export const wibDay = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
const utcDate = (day: string) => new Date(`${day}T12:00:00Z`);
const addDays = (day: string, n: number) => new Date(utcDate(day).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const weekStart = (day: string) => addDays(day, -((utcDate(day).getUTCDay() + 6) % 7));
export const bucketKey = (day: string, interval: AnalyticsFilters["interval"]) =>
  interval === "hari" ? day : interval === "minggu" ? weekStart(day) : day.slice(0, 7);
function nextBucket(key: string, interval: AnalyticsFilters["interval"]): string {
  if (interval === "hari") return addDays(key, 1);
  if (interval === "minggu") return addDays(key, 7);
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
function bucketLabel(key: string, interval: AnalyticsFilters["interval"]): string {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { ...o, timeZone: "UTC" }).format(key.length === 7 ? utcDate(`${key}-01`) : utcDate(key));
  if (interval === "bulan") return f({ month: "short", year: "numeric" });
  return (interval === "minggu" ? "Mgg " : "") + f({ day: "numeric", month: "short" });
}

// ---------------- Penilaian per respons ----------------
export type Scored = {
  id: string;
  at: string;
  day: string;
  status: string;
  participant: string | null;
  who: string;
  groupKey: string;
  groupLabel: string;
  correct: number;
  wrong: number;
  blank: number;
  graded: number; // jumlah soal berkunci
  pct: number | null; // null jika form tidak punya soal berkunci
  cells: Record<string, CellStatus>;
  answers: Record<string, unknown>;
  violations?: number;
};

export function scoreSubmissions(fields: FormField[], subs: RawSubmission[], groupField: FormField | null): Scored[] {
  const keyed = fields.filter(hasAnswerKey);
  return subs.map((s) => {
    const cells: Record<string, CellStatus> = {};
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    for (const f of keyed) {
      const c = gradeCell(f, s.answers[f.id]);
      cells[f.id] = c;
      if (c === "correct") correct += 1;
      else if (c === "wrong") wrong += 1;
      else if (c === "blank") blank += 1;
    }
    const g = groupOf(groupField, groupField ? s.answers[groupField.id] : undefined);
    const email = s.meta.respondent?.email?.trim().toLowerCase() || null;
    return {
      id: s.id,
      at: s.submitted_at,
      day: wibDay(s.submitted_at),
      status: s.status,
      participant: s.respondentId ?? email,
      who: s.meta.respondent?.name?.trim() || s.meta.respondent?.email?.trim() || "",
      groupKey: g.key,
      groupLabel: g.label,
      correct,
      wrong,
      blank,
      graded: keyed.length,
      pct: keyed.length > 0 ? (correct / keyed.length) * 100 : null,
      cells,
      answers: s.answers,
      violations: s.meta.violations,
    };
  });
}

// ---------------- Penyaringan (satu pipeline untuk semua komponen) ----------------
export type Range = { from: string; to: string };

export function selectResponses(rows: Scored[], f: AnalyticsFilters, opts: { range?: Range; ignoreClass?: boolean } = {}): Scored[] {
  const from = opts.range ? opts.range.from : f.from;
  const to = opts.range ? opts.range.to : f.to;
  const needle = f.person.toLowerCase();
  let out = rows.filter((r) => {
    if (f.status === "valid" ? r.status === "spam" : r.status !== f.status) return false;
    if (from && r.day < from) return false;
    if (to && r.day > to) return false;
    if (!opts.ignoreClass && f.cls && r.groupLabel !== f.cls) return false;
    if (needle && !`${r.who} ${r.participant ?? ""} ${r.id}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  if (f.attempt !== "semua") {
    const pick = new Map<string, Scored>();
    for (const r of out) {
      if (!r.participant) continue;
      const cur = pick.get(r.participant);
      if (!cur || (f.attempt === "pertama" ? r.at < cur.at : r.at > cur.at)) pick.set(r.participant, r);
    }
    out = out.filter((r) => !r.participant || pick.get(r.participant) === r);
  }
  if (f.smin !== null || f.smax !== null) {
    out = out.filter((r) => r.pct !== null && r.pct >= (f.smin ?? 0) && r.pct <= (f.smax ?? 100));
  }
  return out;
}

// ---------------- Statistik dasar ----------------
export type Stat = { n: number; mean: number | null; median: number | null; min: number | null; max: number | null; sd: number | null; passed: number; passRate: number | null };

export function describe(values: number[], pass: number): Stat {
  const n = values.length;
  if (n === 0) return { n: 0, mean: null, median: null, min: null, max: null, sd: null, passed: 0, passRate: null };
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / n); // simpangan baku populasi
  const passed = s.filter((v) => v >= pass).length;
  return { n, mean, median, min: s[0], max: s[n - 1], sd, passed, passRate: (passed / n) * 100 };
}

const ratio = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

// ---------------- Hasil analitik ----------------
export type Summary = {
  responses: number;
  identified: number; // respons yang punya identitas akun
  participants: number; // peserta unik teridentifikasi
  hasScores: boolean;
  keyed: number;
  scoreSum: number;
  scoreMax: number;
  scorePct: number | null;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number | null;
  perResponse: Stat;
  perParticipant: Stat;
};

export type ClassRow = {
  key: string;
  label: string;
  responses: number;
  share: number | null;
  participants: number;
  completed: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  passRate: number | null;
  scored: number;
};

export type Bin = { label: string; from: number; to: number; count: number; pct: number | null };
export type TrendPoint = { key: string; label: string; n: number; avg: number | null };

export type QuestionRow = {
  id: string;
  no: number;
  label: string;
  type: string;
  respondents: number;
  answered: number;
  blank: number;
  keyed: boolean;
  correct: number | null;
  wrong: number | null;
  pctCorrect: number | null;
  pctWrong: number | null;
  pctBlank: number | null;
  difficulty: "sulit" | "sedang" | "mudah" | null;
  limited: boolean;
  topLabel: string | null;
  topCount: number;
  topPct: number | null;
  topCorrect: boolean | null;
  review: boolean;
};

export type OptionStat = { id: string; label: string; count: number; pct: number | null; correct: boolean | null };
export type QuestionDetail = {
  row: QuestionRow;
  options: OptionStat[];
  blank: number;
  base: number; // dasar persentase: peserta yang menjawab
  gap: number | null; // selisih opsi terbanyak dengan berikutnya
  byClass: { key: string; label: string; n: number; correct: number | null; pct: number | null; counts: Record<string, number> }[];
  mean: number | null; // skala/rating/angka
  note: string | null;
};

export type Analytics = {
  summary: Summary;
  classes: ClassRow[];
  histogram: Bin[];
  trend: TrendPoint[];
  trendFilled: boolean;
  timeline: { key: string; label: string; n: number }[];
  statusCounts: { status: string; label: string; count: number }[];
  questions: QuestionRow[];
  participants: { id: string; at: string; who: string; group: string; pct: number | null; correct: number; wrong: number; blank: number; attempt: number }[];
};

const MIN_SAMPLE = 10;

export function summarize(rows: Scored[], keyed: number, pass: number): Summary {
  const scored = rows.filter((r) => r.pct !== null);
  const ids = rows.filter((r) => r.participant);
  const byP = new Map<string, number[]>();
  for (const r of scored) if (r.participant) byP.set(r.participant, [...(byP.get(r.participant) ?? []), r.pct as number]);
  const pMeans = [...byP.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length);
  const correct = scored.reduce((a, r) => a + r.correct, 0);
  const wrong = scored.reduce((a, r) => a + r.wrong, 0);
  const blank = scored.reduce((a, r) => a + r.blank, 0);
  const scoreMax = scored.reduce((a, r) => a + r.graded, 0);
  return {
    responses: rows.length,
    identified: ids.length,
    participants: new Set(ids.map((r) => r.participant)).size,
    hasScores: keyed > 0,
    keyed,
    scoreSum: correct,
    scoreMax,
    scorePct: ratio(correct, scoreMax),
    correct,
    wrong,
    blank,
    accuracy: ratio(correct, correct + wrong),
    perResponse: describe(scored.map((r) => r.pct as number), pass),
    perParticipant: describe(pMeans, pass),
  };
}

export function histogram(rows: Scored[], bins: number[]): Bin[] {
  const vals = rows.filter((r) => r.pct !== null).map((r) => r.pct as number);
  const out: Bin[] = [];
  for (let i = 0; i < bins.length - 1; i++) {
    const lo = bins[i];
    const hi = bins[i + 1];
    const last = i === bins.length - 2;
    const count = vals.filter((v) => (last ? v >= lo && v <= hi : v >= lo && v < hi)).length;
    out.push({ label: last ? `${lo}–${hi}` : `${lo}–${hi - 1}`, from: lo, to: hi, count, pct: ratio(count, vals.length) });
  }
  return out;
}

export function trend(rows: Scored[], interval: AnalyticsFilters["interval"]): { points: TrendPoint[]; filled: boolean } {
  const m = new Map<string, number[]>();
  for (const r of rows) if (r.pct !== null) m.set(bucketKey(r.day, interval), [...(m.get(bucketKey(r.day, interval)) ?? []), r.pct]);
  const keys = [...m.keys()].sort();
  if (keys.length === 0) return { points: [], filled: false };
  const avg = (k: string) => {
    const v = m.get(k);
    return v ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  // Periode tanpa data ditandai null (garis putus), tidak diisi nilai karangan.
  const all: string[] = [];
  for (let k = keys[0], guard = 0; k <= keys[keys.length - 1] && guard < 400; k = nextBucket(k, interval), guard++) all.push(k);
  const useAll = all.length > 0 && all[all.length - 1] === keys[keys.length - 1];
  const list = useAll ? all : keys;
  return { points: list.map((k) => ({ key: k, label: bucketLabel(k, interval), n: m.get(k)?.length ?? 0, avg: avg(k) })), filled: useAll };
}

export function classRows(rows: Scored[], pass: number): ClassRow[] {
  const total = rows.length;
  const m = new Map<string, Scored[]>();
  for (const r of rows) m.set(r.groupKey, [...(m.get(r.groupKey) ?? []), r]);
  const out: ClassRow[] = [...m.entries()].map(([key, list]) => {
    const st = describe(list.filter((r) => r.pct !== null).map((r) => r.pct as number), pass);
    return {
      key,
      label: list[0].groupLabel,
      responses: list.length,
      share: ratio(list.length, total),
      participants: new Set(list.filter((r) => r.participant).map((r) => r.participant)).size,
      completed: list.length,
      avg: st.mean,
      min: st.min,
      max: st.max,
      passRate: st.passRate,
      scored: st.n,
    };
  });
  return out.sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label, "id", { numeric: true })));
}

const inputFields = (fields: FormField[]) => fields.filter((f) => isInputType(f.type) && f.type !== "file");
const isChoice = (f: FormField) => f.type === "radio" || f.type === "dropdown" || f.type === "checkbox";
const isScale = (f: FormField) => f.type === "linear_scale" || f.type === "rating";

function scaleRange(f: FormField): [number, number] {
  return f.type === "rating" ? [1, f.ratingMax ?? 5] : [f.scale?.min ?? 1, f.scale?.max ?? 5];
}

/** Opsi terpilih dari satu jawaban: id opsi untuk pilihan, string nilai untuk skala. */
function picks(f: FormField, a: unknown): string[] {
  if (!isAnswered(f, a)) return [];
  if (f.type === "radio" || f.type === "dropdown") {
    const o = a as Record<string, unknown>;
    return typeof o.optionId === "string" && o.optionId ? [o.optionId] : ["__other__"];
  }
  if (f.type === "checkbox") {
    const o = a as Record<string, unknown>;
    const ids = strs(o.optionIds);
    return typeof o.other === "string" && o.other ? [...ids, "__other__"] : ids;
  }
  if (isScale(f)) return [String(a)];
  return [];
}

function optionList(f: FormField): { id: string; label: string }[] {
  if (isChoice(f)) return [...(f.options ?? [])];
  if (isScale(f)) {
    const [lo, hi] = scaleRange(f);
    return Array.from({ length: hi - lo + 1 }, (_, i) => ({ id: String(lo + i), label: String(lo + i) }));
  }
  return [];
}

function buildQuestion(rows: Scored[], f: FormField, no: number, fl: AnalyticsFilters, light = false): QuestionDetail {
  const keyed = hasAnswerKey(f);
  const N = rows.length;
  const opts = optionList(f);
  const counts = new Map<string, number>();
  let answered = 0;
  let correct = 0;
  let wrong = 0;
  const nums: number[] = [];
  const open = new Map<string, number>();
  for (const r of rows) {
    const a = r.answers[f.id];
    if (!isAnswered(f, a)) continue;
    answered += 1;
    for (const p of picks(f, a)) counts.set(p, (counts.get(p) ?? 0) + 1);
    if (isScale(f) || f.type === "number") nums.push(a as number);
    if (f.type === "short_text" || f.type === "number") {
      const key = typeof a === "string" ? norm(a) : String(a);
      open.set(key, (open.get(key) ?? 0) + 1);
    }
    if (keyed) {
      const c = r.cells[f.id] ?? gradeCell(f, a);
      if (c === "correct") correct += 1;
      else if (c === "wrong") wrong += 1;
    }
  }
  const blank = N - answered;
  const keyIds = new Set(f.answerKey?.optionIds ?? []);
  const options: OptionStat[] = opts.map((o) => ({ id: o.id, label: o.label || "(opsi kosong)", count: counts.get(o.id) ?? 0, pct: ratio(counts.get(o.id) ?? 0, answered), correct: keyed ? keyIds.has(o.id) : null }));
  const known = new Set(opts.map((o) => o.id));
  for (const [id, c] of counts) {
    if (known.has(id)) continue;
    options.push({ id, label: id === "__other__" ? "Lainnya (diisi sendiri)" : "(opsi sudah dihapus)", count: c, pct: ratio(c, answered), correct: keyed ? false : null });
  }
  let note: string | null = null;
  if (keyed && (f.type === "short_text" || f.type === "number")) {
    const top = [...open.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const keySet = new Set([...(f.answerKey?.text ?? []).map(norm), ...(typeof f.answerKey?.number === "number" ? [String(f.answerKey.number)] : [])]);
    for (const [k, c] of top) options.push({ id: `t:${k}`, label: k.length > 60 ? `${k.slice(0, 57)}…` : k, count: c, pct: ratio(c, answered), correct: keyed ? keySet.has(k) : null });
    note = "Jawaban teks: menampilkan 5 jawaban terbanyak (huruf besar/kecil dan spasi diabaikan).";
  }
  const sorted = [...options].sort((a, b) => b.count - a.count);
  const top = sorted[0] && sorted[0].count > 0 ? sorted[0] : null;
  const pctCorrect = keyed ? ratio(correct, answered) : null;
  const difficulty = keyed && pctCorrect !== null ? (pctCorrect < fl.hard ? "sulit" : pctCorrect >= fl.easy ? "mudah" : "sedang") : null;
  const topCorrect = top ? top.correct : null;
  const row: QuestionRow = {
    id: f.id,
    no,
    label: f.label || "(tanpa judul)",
    type: f.type,
    respondents: N,
    answered,
    blank,
    keyed,
    correct: keyed ? correct : null,
    wrong: keyed ? wrong : null,
    pctCorrect,
    pctWrong: keyed ? ratio(wrong, answered) : null,
    pctBlank: ratio(blank, N),
    difficulty,
    limited: N < MIN_SAMPLE,
    topLabel: top ? top.label : null,
    topCount: top ? top.count : 0,
    topPct: top ? top.pct : null,
    topCorrect,
    review: keyed && topCorrect === false,
  };

  // Perbandingan antar kelompok: penyebut = peserta di kelompok itu yang menjawab soal ini.
  const groups = new Map<string, Scored[]>();
  if (!light) for (const r of rows) groups.set(r.groupKey, [...(groups.get(r.groupKey) ?? []), r]);
  const byClass = (light ? [] : [...groups.entries()])
    .map(([key, list]) => {
      const ans = list.filter((r) => isAnswered(f, r.answers[f.id]));
      const cnt: Record<string, number> = {};
      for (const r of ans) for (const p of picks(f, r.answers[f.id])) cnt[p] = (cnt[p] ?? 0) + 1;
      const c = keyed ? ans.filter((r) => (r.cells[f.id] ?? gradeCell(f, r.answers[f.id])) === "correct").length : null;
      return { key, label: list[0].groupLabel, n: ans.length, correct: c, pct: c === null ? null : ratio(c, ans.length), counts: cnt };
    })
    .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label, "id", { numeric: true })));

  return {
    row,
    options,
    blank,
    base: answered,
    gap: sorted.length > 1 && sorted[0].count > 0 ? sorted[0].count - sorted[1].count : null,
    byClass,
    mean: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
    note,
  };
}

export function questionRows(rows: Scored[], fields: FormField[], fl: AnalyticsFilters): QuestionRow[] {
  return inputFields(fields).map((f, i) => buildQuestion(rows, f, i + 1, fl, true).row);
}

export type AccItem = { key: string; label: string; value: number; pct: number | null; correct: boolean | null; blank?: boolean };
export type AccQuestion = {
  id: string;
  no: number;
  label: string;
  type: string;
  keyed: boolean;
  respondents: number;
  answered: number;
  blank: number;
  items: AccItem[];
};

/**
 * Akumulasi respons untuk SETIAP soal. Persentase = jumlah ÷ peserta di cakupan filter.
 * Soal pilihan/skala: satu butir per opsi + "Tidak dijawab". Soal isian bebas: "Menjawab" vs "Tidak dijawab".
 * Untuk soal pilihan ganda (checkbox) satu peserta bisa memilih beberapa opsi, sehingga total persentase bisa > 100%.
 */
export function questionAccumulations(rows: Scored[], fields: FormField[], fl: AnalyticsFilters): AccQuestion[] {
  const N = rows.length;
  return inputFields(fields).map((f, i) => {
    const d = buildQuestion(rows, f, i + 1, fl, true);
    const hasOpts = d.options.some((o) => o.count > 0);
    const items: AccItem[] = hasOpts
      ? d.options.map((o) => ({ key: o.id, label: o.label, value: o.count, pct: ratio(o.count, N), correct: o.correct }))
      : [{ key: "_answered", label: "Menjawab", value: d.row.answered, pct: ratio(d.row.answered, N), correct: null }];
    const shown = items.reduce((x, i) => x + i.value, 0);
    if (hasOpts && (f.type === "short_text" || f.type === "number") && d.row.answered > shown) {
      items.push({ key: "_other", label: "Jawaban lain", value: d.row.answered - shown, pct: ratio(d.row.answered - shown, N), correct: null });
    }
    items.push({ key: "_blank", label: "Tidak dijawab", value: d.blank, pct: ratio(d.blank, N), correct: null, blank: true });
    return { id: f.id, no: i + 1, label: d.row.label, type: f.type, keyed: d.row.keyed, respondents: N, answered: d.row.answered, blank: d.blank, items };
  });
}

export function questionDetail(rows: Scored[], fields: FormField[], id: string, fl: AnalyticsFilters): QuestionDetail | null {
  const list = inputFields(fields);
  const i = list.findIndex((f) => f.id === id);
  return i < 0 ? null : buildQuestion(rows, list[i], i + 1, fl);
}

const STATUS_LABEL: Record<string, string> = { received: "Diterima", flagged: "Ditandai", spam: "Spam" };

/** Jumlah respons per periode (semua respons, bukan hanya yang bernilai). Hanya periode yang punya respons. */
export function timeline(rows: Scored[], interval: AnalyticsFilters["interval"]): { key: string; label: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(bucketKey(r.day, interval), (m.get(bucketKey(r.day, interval)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([key, n]) => ({ key, label: bucketLabel(key, interval), n }));
}

export function statusCounts(rows: Scored[]): { status: string; label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.status, (m.get(r.status) ?? 0) + 1);
  return [...m.entries()].map(([status, count]) => ({ status, label: STATUS_LABEL[status] ?? status, count }));
}

export function analyze(rows: Scored[], fields: FormField[], fl: AnalyticsFilters): Analytics {
  const keyed = fields.filter(hasAnswerKey).length;
  const t = trend(rows, fl.interval);
  const seen = new Map<string, number>();
  const ordered = [...rows].sort((a, b) => a.at.localeCompare(b.at));
  const attemptNo = new Map<string, number>();
  for (const r of ordered) {
    if (!r.participant) continue;
    const n = (seen.get(r.participant) ?? 0) + 1;
    seen.set(r.participant, n);
    attemptNo.set(r.id, n);
  }
  return {
    summary: summarize(rows, keyed, fl.pass),
    classes: classRows(rows, fl.pass),
    histogram: histogram(rows, fl.bins),
    trend: t.points,
    trendFilled: t.filled,
    timeline: timeline(rows, fl.interval),
    statusCounts: statusCounts(rows),
    questions: questionRows(rows, fields, fl),
    participants: [...rows]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 500)
      .map((r) => ({ id: r.id, at: r.at, who: r.who, group: r.groupLabel, pct: r.pct, correct: r.correct, wrong: r.wrong, blank: r.blank, attempt: attemptNo.get(r.id) ?? 1 })),
  };
}

// ---------------- Periode pembanding ----------------
export function previousRange(f: AnalyticsFilters): Range | null {
  if (!f.from || !f.to || f.to < f.from) return null;
  const days = Math.round((utcDate(f.to).getTime() - utcDate(f.from).getTime()) / 86_400_000) + 1;
  const to = addDays(f.from, -1);
  return { from: addDays(to, -(days - 1)), to };
}

export type Change = { label: string; current: number | null; previous: number | null; delta: number | null; unit: "poin" | "persen" };
const MIN_COMPARE = 5;

export function changes(cur: Summary, prev: Summary): { items: Change[]; enough: boolean } {
  const enough = prev.responses >= MIN_COMPARE;
  const d = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);
  const items: Change[] = [
    { label: "Jumlah respons", current: cur.responses, previous: prev.responses, delta: prev.responses > 0 ? ((cur.responses - prev.responses) / prev.responses) * 100 : null, unit: "persen" },
  ];
  if (cur.hasScores) {
    items.push(
      { label: "Rata-rata nilai", current: cur.perResponse.mean, previous: prev.perResponse.mean, delta: d(cur.perResponse.mean, prev.perResponse.mean), unit: "poin" },
      { label: "Akurasi jawaban", current: cur.accuracy, previous: prev.accuracy, delta: d(cur.accuracy, prev.accuracy), unit: "poin" },
      { label: "Tingkat kelulusan", current: cur.perResponse.passRate, previous: prev.perResponse.passRate, delta: d(cur.perResponse.passRate, prev.perResponse.passRate), unit: "poin" },
    );
  }
  return { items, enough };
}

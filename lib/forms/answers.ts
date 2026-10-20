import type { FormField } from "./schema";
import { formatFileSize, type UploadedFile } from "./files";

export type ResponseMeta = {
  score?: { correct: number; total: number };
  violations?: number;
  respondent?: { email?: string; name?: string };
  disqualified?: boolean;
  timeExpired?: boolean;
};
export type ResponseRow = { id: string; submitted_at: string; answers: Record<string, unknown>; meta: ResponseMeta };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Membaca metadata respons secara defensif (skor, jumlah pelanggaran/pindah tab, akun, diskualifikasi, waktu habis). */
export function readMeta(raw: unknown): ResponseMeta {
  const m: ResponseMeta = {};
  if (!isObj(raw)) return m;
  const sc = raw.score;
  if (isObj(sc) && typeof sc.correct === "number" && typeof sc.total === "number") m.score = { correct: sc.correct, total: sc.total };
  const vi = raw.violations;
  if (isObj(vi) && typeof vi.count === "number") m.violations = vi.count;

  const proc = raw.proctoring;
  if (isObj(proc)) {
    if (typeof proc.violation_count === "number" && m.violations === undefined) {
      m.violations = proc.violation_count;
    }
    m.disqualified = proc.disqualified === true;
    if (proc.timeExpired === true) m.timeExpired = true;
  }

  const tl = raw.time_limit;
  if (isObj(tl)) {
    if (tl.auto_submitted === true || tl.timeExpired === true) m.timeExpired = true;
  }

  const re = raw.respondent;
  if (isObj(re)) {
    m.respondent = {
      email: typeof re.email === "string" ? re.email : undefined,
      name: typeof re.name === "string" ? re.name : undefined,
    };
  }
  return m;
}

export const isNumericField = (f: FormField) => f.type === "number" || f.type === "linear_scale" || f.type === "rating";

const optLabel = (f: FormField, id: string) => f.options?.find((o) => o.id === id)?.label ?? "(opsi sudah dihapus)";

/** Label pilihan yang dipilih (radio/dropdown/checkbox), satu per elemen. */
export function choiceLabels(f: FormField, v: unknown): string[] {
  if (!isObj(v)) return [];
  if (f.type === "radio" || f.type === "dropdown") {
    if (typeof v.optionId === "string") return [optLabel(f, v.optionId)];
    if (typeof v.other === "string" && v.other) return [`Lainnya: ${v.other}`];
    return [];
  }
  if (f.type === "checkbox") {
    const parts = (Array.isArray(v.optionIds) ? v.optionIds : [])
      .filter((x): x is string => typeof x === "string")
      .map((id) => optLabel(f, id));
    if (typeof v.other === "string" && v.other) parts.push(`Lainnya: ${v.other}`);
    return parts;
  }
  return [];
}

/** Untuk tampilan lencana: array label untuk kolom pilihan, null untuk tipe lain. */
export function answerChips(f: FormField, v: unknown): string[] | null {
  if (f.type === "radio" || f.type === "dropdown" || f.type === "checkbox") return choiceLabels(f, v);
  return null;
}

/** Mengubah jawaban tersimpan (kode opsi, objek) menjadi teks yang bisa dibaca. */
export function formatAnswer(f: FormField, v: unknown, mode: "ui" | "csv" = "ui"): string {
  if (v === undefined || v === null) return "";
  switch (f.type) {
    case "radio":
    case "dropdown":
    case "checkbox":
      return choiceLabels(f, v).join("; "); // pemisah tetap: titik koma + spasi
    case "consent":
      return v === true ? "Ya" : "Tidak";
    case "rating":
      return mode === "ui" ? `${String(v)} / ${f.ratingMax ?? 5}` : String(v);
    case "file": {
      const list = Array.isArray(v) ? (v as UploadedFile[]) : [];
      if (list.length === 0) return "";
      return list.map((item) => `${item.originalFilename} (${formatFileSize(item.sizeBytes)})`).join("; ");
    }
    default:
      return typeof v === "string" ? v : String(v);
  }
}

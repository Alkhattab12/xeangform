import type { FormField } from "./schema";

export type ResponseMeta = {
  score?: { correct: number; total: number };
  violations?: number;
  respondent?: { email?: string; name?: string };
};
export type ResponseRow = { id: string; submitted_at: string; answers: Record<string, unknown>; meta: ResponseMeta };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Membaca metadata respons secara defensif (skor, jumlah pindah tab, akun). */
export function readMeta(raw: unknown): ResponseMeta {
  const m: ResponseMeta = {};
  if (!isObj(raw)) return m;
  const sc = raw.score;
  if (isObj(sc) && typeof sc.correct === "number" && typeof sc.total === "number") m.score = { correct: sc.correct, total: sc.total };
  const vi = raw.violations;
  if (isObj(vi) && typeof vi.count === "number") m.violations = vi.count;
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

/** Mengubah jawaban tersimpan (kode opsi, objek) menjadi teks yang bisa dibaca. */
export function formatAnswer(f: FormField, v: unknown, mode: "ui" | "csv" = "ui"): string {
  if (v === undefined || v === null) return "";
  switch (f.type) {
    case "radio":
    case "dropdown": {
      const o = isObj(v) ? v : {};
      if (typeof o.optionId === "string") return optLabel(f, o.optionId);
      if (typeof o.other === "string" && o.other) return `Lainnya: ${o.other}`;
      return "";
    }
    case "checkbox": {
      const o = isObj(v) ? v : {};
      const parts = (Array.isArray(o.optionIds) ? o.optionIds : [])
        .filter((x): x is string => typeof x === "string")
        .map((id) => optLabel(f, id));
      if (typeof o.other === "string" && o.other) parts.push(`Lainnya: ${o.other}`);
      return parts.join("; "); // pemisah tetap: titik koma + spasi
    }
    case "consent":
      return v === true ? "Ya" : "Tidak";
    case "rating":
      return mode === "ui" ? `${String(v)} / ${f.ratingMax ?? 5}` : String(v);
    case "file":
      return "";
    default:
      return typeof v === "string" ? v : String(v);
  }
}

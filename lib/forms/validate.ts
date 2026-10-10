import { isInputType, type FormField } from "./schema";

/** Penanda opsi "Lainnya" pada jawaban radio/checkbox. */
export const OTHER = "__other__";

export type ValidationResult =
  | { ok: true; answers: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

type CheckResult = { error: string } | { value: unknown } | { empty: true };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^\+?[0-9\s().-]{6,24}$/;
const REQ = "Wajib diisi.";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function checkField(f: FormField, v: unknown): CheckResult {
  switch (f.type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
    case "url":
    case "date":
    case "time": {
      const s = str(v);
      if (!s) return f.required ? { error: REQ } : { empty: true };

      if (f.type === "short_text" || f.type === "long_text") {
        const hard = f.type === "long_text" ? 10000 : 1000;
        const max = Math.min(f.maxLength ?? hard, hard);
        if (f.minLength != null && s.length < f.minLength) return { error: `Minimal ${f.minLength} karakter.` };
        if (s.length > max) return { error: `Maksimal ${max} karakter.` };
      } else if (f.type === "email") {
        if (s.length > 254 || !EMAIL_RE.test(s)) return { error: "Masukkan email yang valid, contoh: nama@email.com." };
      } else if (f.type === "phone") {
        if (!PHONE_RE.test(s) || s.replace(/\D/g, "").length < 6) return { error: "Masukkan nomor telepon yang valid." };
      } else if (f.type === "url") {
        let ok = s.length <= 2048;
        try {
          const u = new URL(s);
          if (u.protocol !== "http:" && u.protocol !== "https:") ok = false;
        } catch {
          ok = false;
        }
        if (!ok) return { error: "Masukkan URL yang valid, diawali http:// atau https://." };
      } else if (f.type === "date") {
        const m = DATE_RE.exec(s);
        const dt = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
        const ok = !!m && !!dt && dt.getUTCFullYear() === +m[1] && dt.getUTCMonth() === +m[2] - 1 && dt.getUTCDate() === +m[3];
        if (!ok) return { error: "Masukkan tanggal yang valid." };
      } else if (!TIME_RE.test(s)) {
        return { error: "Masukkan waktu yang valid." };
      }
      return { value: s };
    }

    case "number": {
      const s = typeof v === "number" ? String(v) : str(v);
      if (!s) return f.required ? { error: REQ } : { empty: true };
      const n = Number(s);
      if (!Number.isFinite(n)) return { error: "Masukkan angka yang valid." };
      const { min, max } = f;
      if (min != null && max != null && (n < min || n > max)) return { error: `Isi angka antara ${min} dan ${max}.` };
      if (min != null && n < min) return { error: `Angka minimal ${min}.` };
      if (max != null && n > max) return { error: `Angka maksimal ${max}.` };
      return { value: n };
    }

    case "radio": {
      const o = isObj(v) ? v : {};
      const id = typeof o.optionId === "string" ? o.optionId : "";
      if (!id) return f.required ? { error: "Pilih salah satu." } : { empty: true };
      if (id === OTHER) {
        if (!f.allowOther) return { error: "Pilihan tidak valid." };
        const other = str(o.other);
        if (!other) return { error: "Tulis jawaban lainnya." };
        if (other.length > 500) return { error: "Maksimal 500 karakter." };
        return { value: { optionId: null, other } };
      }
      if (!f.options?.some((x) => x.id === id)) return { error: "Pilihan tidak valid." };
      return { value: { optionId: id } };
    }

    case "dropdown": {
      const o = isObj(v) ? v : {};
      const id = typeof o.optionId === "string" ? o.optionId : "";
      if (!id) return f.required ? { error: "Pilih salah satu." } : { empty: true };
      if (!f.options?.some((x) => x.id === id)) return { error: "Pilihan tidak valid." };
      return { value: { optionId: id } };
    }

    case "checkbox": {
      const o = isObj(v) ? v : {};
      const ids = Array.isArray(o.optionIds) ? o.optionIds.filter((x): x is string => typeof x === "string") : [];
      const uniq = [...new Set(ids)];
      const wantsOther = uniq.includes(OTHER);
      const real = uniq.filter((i) => i !== OTHER);
      if (real.length === 0 && !wantsOther) return f.required ? { error: "Pilih minimal satu." } : { empty: true };
      if (real.some((i) => !f.options?.some((x) => x.id === i))) return { error: "Pilihan tidak valid." };
      if (wantsOther) {
        if (!f.allowOther) return { error: "Pilihan tidak valid." };
        const other = str(o.other);
        if (!other) return { error: "Tulis jawaban lainnya." };
        if (other.length > 500) return { error: "Maksimal 500 karakter." };
        return { value: { optionIds: real, other } };
      }
      return { value: { optionIds: real } };
    }

    case "linear_scale":
    case "rating": {
      if (v === undefined || v === null || v === "") return f.required ? { error: "Pilih salah satu nilai." } : { empty: true };
      const n = typeof v === "number" ? v : Number(str(v));
      const lo = f.type === "rating" ? 1 : (f.scale?.min ?? 1);
      const hi = f.type === "rating" ? (f.ratingMax ?? 5) : (f.scale?.max ?? 5);
      if (!Number.isInteger(n) || n < lo || n > hi) return { error: "Nilai tidak valid." };
      return { value: n };
    }

    case "consent":
      if (v === true) return { value: true };
      return f.required ? { error: "Centang persetujuan untuk melanjutkan." } : { value: false };

    case "file":
      // Unggah file diaktifkan di tahap berikutnya. Kolom wajib tidak boleh lolos tanpa file.
      return f.required ? { error: "Unggah file belum tersedia di form ini. Hubungi pembuat form." } : { empty: true };

    default:
      return { empty: true };
  }
}

/** Otoritatif di server; dipakai juga di browser untuk umpan balik instan. */
export function validateAnswers(fields: FormField[], raw: unknown): ValidationResult {
  const input = isObj(raw) ? raw : {};
  const errors: Record<string, string> = {};
  const answers: Record<string, unknown> = {};

  for (const f of fields) {
    if (!isInputType(f.type)) continue;
    const r = checkField(f, input[f.id]);
    if ("error" in r) errors[f.id] = r.error;
    else if ("value" in r) answers[f.id] = r.value;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

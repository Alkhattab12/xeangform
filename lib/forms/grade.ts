import { hasAnswerKey, type FormField } from "./schema";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Menilai jawaban yang SUDAH divalidasi. Dipanggil hanya di server.
 * Total = jumlah soal yang punya kunci. Soal tanpa kunci tidak dihitung. Tidak dijawab = salah.
 */
export function gradeQuiz(fields: FormField[], answers: Record<string, unknown>): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const f of fields) {
    if (!hasAnswerKey(f)) continue;
    total += 1;
    const a = answers[f.id];
    const k = f.answerKey ?? {};
    switch (f.type) {
      case "radio":
      case "dropdown": {
        const o = isObj(a) ? a : {};
        if (typeof o.optionId === "string" && o.optionId === (k.optionIds ?? [])[0]) correct += 1;
        break;
      }
      case "checkbox": {
        const o = isObj(a) ? a : {};
        const got = Array.isArray(o.optionIds) ? o.optionIds.filter((x): x is string => typeof x === "string") : [];
        const want = k.optionIds ?? [];
        const hasOther = typeof o.other === "string" && o.other !== "";
        if (!hasOther && got.length === want.length && want.every((id) => got.includes(id))) correct += 1;
        break;
      }
      case "short_text": {
        if (typeof a === "string") {
          const n = norm(a);
          if ((k.text ?? []).some((t) => norm(t) === n)) correct += 1;
        }
        break;
      }
      case "number": {
        if (typeof a === "number" && typeof k.number === "number" && Math.abs(a - k.number) < 1e-9) correct += 1;
        break;
      }
      default:
        break;
    }
  }
  return { correct, total };
}

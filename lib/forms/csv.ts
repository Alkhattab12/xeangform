import { formatAnswer, isNumericField, type ResponseRow } from "./answers";
import { isInputType, type FormField } from "./schema";

const BOM = "\uFEFF"; // agar Excel membaca UTF-8 (huruf Indonesia) dengan benar

/** Kutip sel; lindungi dari CSV/formula injection (=, +, -, @) untuk teks bebas. */
function cell(value: string, guard: boolean): string {
  let s = value;
  if (guard && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const wib = (iso: string) => new Date(Date.parse(iso) + 7 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);

export function buildCsv(fields: FormField[], rows: ResponseRow[]): string {
  const cols = fields.filter((f) => isInputType(f.type) && f.type !== "file");

  // Judul kolom = label; label kembar diberi nomor agar tidak ambigu
  const seen = new Map<string, number>();
  const headers = cols.map((f) => {
    const base = f.label.trim() || "(tanpa judul)";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });

  const lines = [["ID respons", "Waktu kirim (WIB)", ...headers].map((h) => cell(h, true)).join(",")];
  for (const r of rows) {
    const cells = [cell(r.id, false), cell(wib(r.submitted_at), false)];
    for (const f of cols) {
      const text = formatAnswer(f, r.answers[f.id], "csv");
      cells.push(cell(text, !isNumericField(f))); // angka (mis. -5) tidak diberi awalan
    }
    lines.push(cells.join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

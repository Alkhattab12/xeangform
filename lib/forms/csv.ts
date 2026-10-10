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

export type CsvOptions = { quiz?: boolean; proctor?: boolean; accounts?: boolean };

export function buildCsv(fields: FormField[], rows: ResponseRow[], opts: CsvOptions = {}): string {
  const cols = fields.filter((f) => isInputType(f.type) && f.type !== "file");

  // Judul kolom = label; label kembar diberi nomor agar tidak ambigu
  const seen = new Map<string, number>();
  const headers = cols.map((f) => {
    const base = f.label.trim() || "(tanpa judul)";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });

  const extra: string[] = [];
  if (opts.accounts) extra.push("Akun (email)", "Nama akun");
  if (opts.quiz) extra.push("Benar", "Total soal");
  if (opts.proctor) extra.push("Pindah tab/jendela (kali)");

  const lines = [["ID respons", "Waktu kirim (WIB)", ...extra, ...headers].map((h) => cell(h, true)).join(",")];
  for (const r of rows) {
    const cells = [cell(r.id, false), cell(wib(r.submitted_at), false)];
    if (opts.accounts) cells.push(cell(r.meta.respondent?.email ?? "", true), cell(r.meta.respondent?.name ?? "", true));
    if (opts.quiz) cells.push(r.meta.score ? String(r.meta.score.correct) : "", r.meta.score ? String(r.meta.score.total) : "");
    if (opts.proctor) cells.push(r.meta.violations !== undefined ? String(r.meta.violations) : "");
    for (const f of cols) {
      const text = formatAnswer(f, r.answers[f.id], "csv");
      cells.push(cell(text, !isNumericField(f))); // angka (mis. -5) tidak diberi awalan
    }
    lines.push(cells.join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

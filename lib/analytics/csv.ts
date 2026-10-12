import { cell } from "@/lib/forms/csv";

const BOM = "\uFEFF";
export type CsvCell = string | number | null | undefined;

const text = (v: CsvCell): string => (v === null || v === undefined ? "" : typeof v === "number" ? String(Math.round(v * 100) / 100) : v);

/** Teks bebas dilindungi dari formula injection; angka tidak diberi awalan. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const line = (r: CsvCell[]) => r.map((v) => cell(text(v), typeof v === "string")).join(",");
  return BOM + [line(headers), ...rows.map(line)].join("\r\n") + "\r\n";
}

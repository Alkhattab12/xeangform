import type { FormField } from "./schema";
import { isInputType } from "./schema";

export type FormPage = { title: string; description?: string; fields: FormField[] };

/** Membagi kolom menjadi halaman berdasarkan "Halaman baru" (page_break). Halaman tanpa kolom dibuang. */
export function splitPages(fields: FormField[]): FormPage[] {
  const pages: FormPage[] = [{ title: "", fields: [] }];
  for (const f of fields) {
    if (f.type === "page_break") pages.push({ title: f.label.trim(), description: f.description, fields: [] });
    else pages[pages.length - 1].fields.push(f);
  }
  const filled = pages.filter((p) => p.fields.length > 0);
  return filled.length ? filled : [pages[0]];
}

/** Indeks halaman yang memuat kolom tertentu (-1 jika tidak ada). */
export function pageIndexOf(pages: FormPage[], fieldId: string): number {
  return pages.findIndex((p) => p.fields.some((f) => f.id === fieldId));
}

/** ID kolom pertama (urutan tampil) yang punya error. */
export function firstErrorFieldId(fields: FormField[], errors: Record<string, string>): string | null {
  for (const f of fields) if (isInputType(f.type) && errors[f.id]) return f.id;
  return null;
}

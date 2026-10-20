import type { FormField } from "./schema";
import { isInputType } from "./schema";
import type { FormPage } from "./pages";

// Pengacakan deterministik (seeded): seed yang sama selalu menghasilkan urutan yang sama,
// sehingga urutan soal/opsi tidak berubah saat peserta memuat ulang halaman di tengah ujian.
// Hanya memengaruhi TAMPILAN: jawaban dan penilaian tetap memakai ID soal dan ID opsi asli.

/** Hash string -> bilangan bulat 32-bit (cyrb53 versi ringkas). */
function hashSeed(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

/** mulberry32: PRNG kecil berseed, menghasilkan angka [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates berseed. Tidak mengubah array asal. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  const rand = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Soal yang boleh berpindah posisi. Judul bagian, paragraf, pemisah, dan persetujuan tetap di tempatnya. */
const isShufflableQuestion = (f: FormField) => isInputType(f.type) && f.type !== "consent";

/**
 * Mengacak urutan soal di dalam tiap halaman. Elemen tata letak (bagian, paragraf, pemisah) dan
 * persetujuan tetap pada posisinya; soal saling bertukar di antara posisi soal yang tersedia.
 * Batas halaman (page_break) tidak dilewati.
 */
export function shufflePages(pages: FormPage[], seed: string): FormPage[] {
  return pages.map((page, pi) => {
    const slots: number[] = [];
    page.fields.forEach((f, i) => {
      if (isShufflableQuestion(f)) slots.push(i);
    });
    if (slots.length < 2) return page;
    const mixed = seededShuffle(
      slots.map((i) => page.fields[i]),
      `${seed}|q|${pi}`,
    );
    const fields = page.fields.slice();
    slots.forEach((slot, k) => {
      fields[slot] = mixed[k];
    });
    return { ...page, fields };
  });
}

const OPTION_TYPES = new Set<FormField["type"]>(["radio", "checkbox", "dropdown"]);

/** Opsi jawaban untuk ditampilkan. Opsi "Lainnya" dirender terpisah dan selalu tetap di akhir. */
export function optionsForDisplay(field: FormField, seed: string, enabled: boolean): NonNullable<FormField["options"]> {
  const opts = field.options ?? [];
  if (!enabled || !seed || !OPTION_TYPES.has(field.type) || opts.length < 2) return opts;
  return seededShuffle(opts, `${seed}|o|${field.id}`);
}

import { nanoid } from "nanoid";
import type { FieldType, FormField } from "./schema";

export const FIELD_META: Record<FieldType, { label: string }> = {
  short_text: { label: "Jawaban singkat" },
  long_text: { label: "Jawaban panjang" },
  email: { label: "Email" },
  phone: { label: "Nomor telepon" },
  number: { label: "Angka" },
  url: { label: "URL" },
  radio: { label: "Pilihan tunggal" },
  checkbox: { label: "Pilihan ganda" },
  dropdown: { label: "Dropdown" },
  linear_scale: { label: "Skala linear" },
  rating: { label: "Rating" },
  date: { label: "Tanggal" },
  time: { label: "Waktu" },
  file: { label: "Unggah file" },
  section: { label: "Judul bagian" },
  paragraph: { label: "Teks informasi" },
  divider: { label: "Pembatas" },
  consent: { label: "Persetujuan" },
};

export const FIELD_GROUPS: { title: string; types: FieldType[] }[] = [
  { title: "Teks & data", types: ["short_text", "long_text", "email", "phone", "number", "url", "date", "time"] },
  { title: "Pilihan", types: ["radio", "checkbox", "dropdown"] },
  { title: "Penilaian", types: ["linear_scale", "rating"] },
  { title: "Lainnya", types: ["file", "consent", "section", "paragraph", "divider"] },
];

const DEFAULT_LABEL: Record<FieldType, string> = {
  short_text: "Pertanyaan baru", long_text: "Pertanyaan baru", email: "Email", phone: "Nomor telepon",
  number: "Angka", url: "Tautan (URL)", radio: "Pertanyaan baru", checkbox: "Pertanyaan baru",
  dropdown: "Pertanyaan baru", linear_scale: "Pertanyaan baru", rating: "Beri penilaian", date: "Tanggal",
  time: "Waktu", file: "Unggah file", section: "Judul bagian", paragraph: "Tulis teks informasi di sini.",
  divider: "", consent: "Saya menyetujui syarat dan ketentuan.",
};

export const newFieldId = () => `f_${nanoid(8)}`;
export const newOptionId = () => `o_${nanoid(6)}`;

export function createField(type: FieldType): FormField {
  const f: FormField = { id: newFieldId(), type, label: DEFAULT_LABEL[type], required: type === "consent" };
  if (type === "radio" || type === "checkbox" || type === "dropdown") {
    f.options = [1, 2].map((n) => ({ id: newOptionId(), label: `Opsi ${n}` }));
  }
  if (type === "linear_scale") f.scale = { min: 1, max: 5 };
  if (type === "rating") f.ratingMax = 5;
  if (type === "file") f.file = { accept: ["pdf", "image"], maxSizeMb: 10, maxFiles: 1 };
  return f;
}

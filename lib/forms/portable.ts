import { newFieldId, newOptionId } from "./field-meta";
import {
  DEFAULT_SETTINGS,
  FIELD_TYPES,
  FILE_CATEGORIES,
  fieldStyleSchema,
  formSchemaJson,
  formThemeSchema,
  hasAnswerKey,
  parseSettings,
  type FieldType,
  type FileCategory,
  type FormField,
  type FormSettings,
  type FormTheme,
} from "./schema";

export const MAX_IMPORT_BYTES = 500_000;
const MAX_FIELDS = 100;

export type ImportedForm = { title: string; description: string; fields: FormField[]; settings: FormSettings; theme: FormTheme | null };
export type ParseResult =
  | { ok: true; form: ImportedForm; warnings: string[] }
  | { ok: false; errors: string[] };

/** Nama lain yang sering dipakai AI -> tipe Syamil Form. */
const ALIASES: Record<string, FieldType> = {
  text: "short_text", short_answer: "short_text", shorttext: "short_text", input: "short_text",
  textarea: "long_text", long_answer: "long_text", paragraph_text: "long_text", longtext: "long_text",
  telephone: "phone", tel: "phone",
  multiple_choice: "radio", single_choice: "radio", choice: "radio", radio_buttons: "radio",
  checkboxes: "checkbox", multi_select: "checkbox", multiple_select: "checkbox",
  select: "dropdown",
  scale: "linear_scale", linear: "linear_scale",
  star_rating: "rating", stars: "rating",
  upload: "file", file_upload: "file", attachment: "file",
  heading: "section",
  info: "paragraph", text_block: "paragraph",
  separator: "divider", hr: "divider",
  page: "page_break", new_page: "page_break", pagebreak: "page_break", section_break: "page_break", halaman: "page_break",
  agreement: "consent", terms: "consent",
};

const TEXTY = new Set<FieldType>(["short_text", "long_text", "email", "phone", "number", "url"]);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
};
const num = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function normType(v: unknown): FieldType | null {
  if (typeof v !== "string") return null;
  const k = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((FIELD_TYPES as readonly string[]).includes(k)) return k as FieldType;
  return ALIASES[k] ?? null;
}

/** Membuang pembungkus ```json ... ``` atau teks pengantar dari AI. */
function extractJson(input: string): string {
  let s = input.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const i = s.search(/[[{]/);
    const j = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (i >= 0 && j > i) s = s.slice(i, j + 1);
  }
  return s;
}

function parseField(raw: unknown, n: number, warnings: string[], errors: string[]): FormField | null {
  if (!isObj(raw)) {
    errors.push(`Kolom ${n}: bukan objek JSON.`);
    return null;
  }
  const type = normType(raw.type);
  if (!type) {
    errors.push(`Kolom ${n}: tipe "${String(raw.type).slice(0, 40)}" tidak dikenali.`);
    return null;
  }

  const label = text(raw.label ?? raw.question ?? raw.title, type === "paragraph" ? 2000 : 300) ?? "";
  if (!label && type !== "divider" && type !== "page_break") warnings.push(`Kolom ${n} (${type}) belum punya judul. Isi di editor sebelum menerbitkan.`);

  // "Wajib" diterima dalam beberapa bentuk yang sering dipakai AI: true, "true", "ya", "yes", 1, "wajib"
  const reqRaw = raw.required ?? raw.mandatory ?? raw.wajib;
  const truthy =
    reqRaw === true ||
    reqRaw === 1 ||
    (typeof reqRaw === "string" && ["true", "ya", "yes", "y", "1", "wajib"].includes(reqRaw.trim().toLowerCase()));
  const required = type === "consent" ? reqRaw === undefined || truthy : truthy;
  const f: FormField = { id: newFieldId(), type, label, required: type === "divider" || type === "page_break" ? false : required };

  if (type !== "paragraph" && type !== "divider") {
    const d = text(raw.description ?? raw.helpText ?? raw.help, 1000);
    if (d) f.description = d;
  }
  if (TEXTY.has(type)) {
    const p = text(raw.placeholder, 200);
    if (p) f.placeholder = p;
  }
  if (type === "short_text" || type === "long_text") {
    const a = num(raw.minLength);
    const b = num(raw.maxLength);
    if (a !== undefined) f.minLength = clamp(Math.trunc(a), 0, 10000);
    if (b !== undefined) f.maxLength = clamp(Math.trunc(b), 0, 10000);
  }
  if (type === "number") {
    const a = num(raw.min);
    const b = num(raw.max);
    if (a !== undefined) f.min = clamp(a, -1e12, 1e12);
    if (b !== undefined) f.max = clamp(b, -1e12, 1e12);
  }

  if (type === "radio" || type === "checkbox" || type === "dropdown") {
    const rawOpts: unknown[] = Array.isArray(raw.options) ? raw.options : Array.isArray(raw.choices) ? raw.choices : [];
    const labels = rawOpts
      .map((o) => (typeof o === "string" ? o : typeof o === "number" ? String(o) : isObj(o) ? (text(o.label, 200) ?? text(o.text, 200) ?? "") : ""))
      .map((s) => s.trim().slice(0, 200))
      .filter(Boolean);
    if (labels.length === 0) {
      errors.push(`Kolom ${n}: pilihan butuh minimal satu opsi ("options").`);
      return null;
    }
    if (labels.length > 100) warnings.push(`Kolom ${n}: opsi dipotong menjadi 100.`);
    f.options = labels.slice(0, 100).map((l) => ({ id: newOptionId(), label: l }));
    if (type !== "dropdown" && raw.allowOther === true) f.allowOther = true;
  }

  // Kunci jawaban kuis: "correct" (alias: answer, correctAnswer)
  const correct = raw.correct ?? raw.answer ?? raw.correctAnswer;
  if (correct !== undefined && correct !== null && correct !== "") {
    const list = Array.isArray(correct) ? correct : [correct];
    if (type === "radio" || type === "dropdown" || type === "checkbox") {
      const wanted = list.map((c) => String(c).trim().toLowerCase());
      const ids = (f.options ?? []).filter((o) => wanted.includes(o.label.trim().toLowerCase())).map((o) => o.id);
      if (ids.length === 0) {
        warnings.push(`Kolom ${n}: kunci jawaban tidak cocok dengan teks opsi mana pun, jadi soal tidak dinilai.`);
      } else if (type === "checkbox") {
        f.answerKey = { optionIds: ids };
        if (ids.length < wanted.length) warnings.push(`Kolom ${n}: sebagian kunci tidak cocok dengan opsi dan diabaikan.`);
      } else {
        f.answerKey = { optionIds: [ids[0]] };
        if (wanted.length > 1) warnings.push(`Kolom ${n}: pilihan tunggal hanya punya satu kunci. Memakai yang pertama.`);
      }
    } else if (type === "short_text") {
      const texts = list.map((c) => String(c).trim().slice(0, 200)).filter(Boolean).slice(0, 20);
      if (texts.length) f.answerKey = { text: texts };
    } else if (type === "number") {
      const v = num(list[0]);
      if (v !== undefined) f.answerKey = { number: clamp(v, -1e12, 1e12) };
      else warnings.push(`Kolom ${n}: kunci angka tidak valid.`);
    } else {
      warnings.push(`Kolom ${n}: tipe ${type} tidak mendukung kunci jawaban.`);
    }
  }

  if (type === "linear_scale") {
    const sc = isObj(raw.scale) ? raw.scale : raw;
    const min = (num(sc.min) ?? 1) <= 0 ? 0 : 1;
    const max = clamp(Math.trunc(num(sc.max) ?? 5), 2, 10);
    f.scale = { min, max, minLabel: text(sc.minLabel, 60), maxLabel: text(sc.maxLabel, 60) };
  }
  if (type === "rating") f.ratingMax = clamp(Math.trunc(num(raw.ratingMax ?? raw.max) ?? 5), 3, 10);

  if (type === "file") {
    const fo = isObj(raw.file) ? raw.file : raw;
    const accept: FileCategory[] = [];
    if (Array.isArray(fo.accept)) {
      for (const x of fo.accept) {
        if ((FILE_CATEGORIES as readonly string[]).includes(x as string) && !accept.includes(x as FileCategory)) accept.push(x as FileCategory);
      }
    }
    if (accept.length === 0) {
      accept.push("pdf", "image");
      warnings.push(`Kolom ${n}: tipe file tidak ditentukan, memakai PDF dan gambar.`);
    }
    f.file = {
      accept,
      maxSizeMb: clamp(num(fo.maxSizeMb) ?? 10, 1, 25),
      maxFiles: clamp(Math.trunc(num(fo.maxFiles) ?? 1), 1, 10),
    };
  }
  if (raw.style !== undefined && type !== "page_break" && type !== "divider") {
    const st = fieldStyleSchema.safeParse(raw.style);
    if (st.success && Object.keys(st.data).length > 0) f.style = st.data;
    else warnings.push(`Kolom ${n}: gaya ("style") tidak valid dan diabaikan.`);
  }
  return f;
}

/** Dipakai di browser (pratinjau) DAN server (otoritatif). */
export function parseImport(input: string): ParseResult {
  if (!input.trim()) return { ok: false, errors: ["Belum ada isi. Tempel JSON atau pilih file."] };
  if (input.length > MAX_IMPORT_BYTES) return { ok: false, errors: ["Isi terlalu besar (maksimal 500 KB)."] };

  let data: unknown;
  try {
    data = JSON.parse(extractJson(input));
  } catch {
    return { ok: false, errors: ["Isi bukan JSON yang valid. Cek tanda kutip dan koma, atau minta AI memperbaikinya."] };
  }

  const root: unknown = isObj(data) && isObj(data.form) ? data.form : data;
  const rawFields: unknown[] | null = Array.isArray(root) ? root : isObj(root) && Array.isArray(root.fields) ? root.fields : null;
  if (!rawFields) return { ok: false, errors: ['Tidak menemukan daftar kolom ("fields").'] };
  if (rawFields.length === 0) return { ok: false, errors: ["Daftar kolom kosong."] };
  if (rawFields.length > MAX_FIELDS) return { ok: false, errors: [`Terlalu banyak kolom (${rawFields.length}). Maksimal ${MAX_FIELDS}.`] };

  const meta = isObj(root) ? root : {};
  const warnings: string[] = [];
  const errors: string[] = [];

  const title = text(meta.title, 200);
  if (!title) warnings.push('Judul form tidak ada. Memakai "Form Tanpa Judul".');
  const description = text(meta.description, 2000) ?? "";
  let theme: FormTheme | null = null;
  if (meta.theme !== undefined && meta.theme !== null) {
    const th = formThemeSchema.safeParse(meta.theme);
    if (th.success) theme = th.data;
    else warnings.push("Tema pada file tidak valid dan diabaikan.");
  }
  const rawSettings = isObj(meta.settings) ? meta.settings : {};
  const settings: FormSettings = parseSettings(rawSettings);
  if (rawSettings.quiz !== undefined) settings.quiz = rawSettings.quiz === true;
  if (rawSettings.allowTabSwitch !== undefined) settings.allowTabSwitch = rawSettings.allowTabSwitch !== false;
  if (rawSettings.oneResponsePerAccount !== undefined) settings.oneResponsePerAccount = rawSettings.oneResponsePerAccount === true;

  const fields: FormField[] = [];
  rawFields.forEach((r, i) => {
    const f = parseField(r, i + 1, warnings, errors);
    if (f) fields.push(f);
  });

  if (errors.length) {
    const shown = errors.slice(0, 20);
    if (errors.length > 20) shown.push(`…dan ${errors.length - 20} kesalahan lain.`);
    return { ok: false, errors: shown };
  }
  if (!settings.quiz && rawSettings.quiz === undefined && fields.some(hasAnswerKey)) {
    settings.quiz = true;
    warnings.push("Ada kunci jawaban, jadi mode kuis diaktifkan otomatis.");
  }
  if (!formSchemaJson.safeParse({ fields }).success) return { ok: false, errors: ["Struktur hasil impor tidak valid."] };
  return { ok: true, form: { title: title ?? "Form Tanpa Judul", description, fields, settings, theme }, warnings };
}

function toPortable(f: FormField) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, options, type, label, answerKey, ...rest } = f;
  const out: Record<string, unknown> = { type, label, ...rest, ...(options ? { options: options.map((o) => o.label) } : {}) };
  if (answerKey && hasAnswerKey(f)) {
    const labelOf = (oid: string) => options?.find((o) => o.id === oid)?.label ?? "";
    if (type === "radio" || type === "dropdown") out.correct = labelOf(answerKey.optionIds?.[0] ?? "");
    else if (type === "checkbox") out.correct = (answerKey.optionIds ?? []).map(labelOf);
    else if (type === "short_text") out.correct = answerKey.text;
    else if (type === "number") out.correct = answerKey.number;
  }
  return out;
}

/** Format ekspor = format impor (satu format untuk manusia dan AI). ID tidak diekspor. */
export function buildExport(
  title: string,
  description: string,
  fields: FormField[],
  settings: FormSettings = DEFAULT_SETTINGS,
  theme: FormTheme | null = null,
) {
  return {
    format: "syamil-form",
    version: 1,
    exportedAt: new Date().toISOString(),
    form: { title, description, settings, ...(theme ? { theme } : {}), fields: fields.map(toPortable) },
  };
}

export const AI_PROMPT = `Buatkan form dalam format JSON untuk aplikasi Syamil Form.

ATURAN:
- Keluarkan HANYA JSON yang valid. Tanpa penjelasan, tanpa blok kode markdown.
- Gunakan bahasa Indonesia untuk judul dan pertanyaan.
- Maksimal 100 kolom.

FORMAT:
{
  "format": "syamil-form",
  "version": 1,
  "form": {
    "title": "Judul form",
    "description": "Deskripsi singkat (opsional)",
    "fields": [ ...daftar kolom... ]
  }
}

JENIS KOLOM ("type"):
short_text, long_text, email, phone, number, url, radio, checkbox, dropdown, linear_scale, rating, date, time, file, section, paragraph, divider, page_break, consent
Catatan: "paragraph" adalah teks informasi (bukan kolom jawaban). Untuk jawaban panjang pakai "long_text".
"page_break" memulai halaman baru (form bertahap). "label" = judul halaman, opsional. Kolom setelahnya masuk ke halaman itu.

PROPERTI KOLOM:
- "label": teks pertanyaan (wajib, kecuali divider)
- "description": keterangan tambahan (opsional)
- "required": true (wajib dijawab) atau false (opsional). Tulis true untuk setiap pertanyaan yang harus dijawab.
- "placeholder": contoh isian (opsional, untuk kolom teks)
- "options": daftar teks pilihan, contoh ["A","B","C"] (WAJIB untuk radio, checkbox, dropdown)
- "allowOther": true untuk menambah opsi "Lainnya" (radio/checkbox)
- "minLength", "maxLength": batas karakter (short_text, long_text)
- "min", "max": batas angka (number)
- "scale": {"min": 1, "max": 5, "minLabel": "Tidak setuju", "maxLabel": "Setuju"} (linear_scale; min 0 atau 1, max 2-10)
- "ratingMax": jumlah bintang 3-10 (rating)
- "file": {"accept": ["pdf","image","document","spreadsheet"], "maxSizeMb": 10, "maxFiles": 1} (file)

KUIS & PENGATURAN (opsional):
- Di "form" boleh ada "settings": {"quiz": true, "allowTabSwitch": false, "oneResponsePerAccount": true}
  quiz = dinilai otomatis; allowTabSwitch false = pindah tab/jendela dideteksi; oneResponsePerAccount = 1 akun hanya 1 kali mengisi.
- "form" juga boleh punya "theme": {"preset": "galaxy"}. Tambahkan "motion": "dinamis" agar latar dan hiasan tema bergerak (bawaan: "diam"). Pilihan preset: unik, keren, abstrak, neo, imut, cooking, galaxy, kebumian, biologi, sosial.
- Kunci jawaban pakai "correct" di dalam kolom:
  radio atau dropdown: teks opsi yang benar, HARUS sama persis dengan salah satu isi "options". Contoh "correct": "XI"
  checkbox: daftar teks opsi yang benar. Contoh "correct": ["Musik","Olahraga"]
  short_text: daftar jawaban yang diterima. Contoh "correct": ["Jakarta"]
  number: angka. Contoh "correct": 42
- Kolom tanpa "correct" tidak ikut dinilai.

CONTOH KOLOM:
{"type":"short_text","label":"Nama lengkap","required":true}
{"type":"radio","label":"Kelas","options":["X","XI","XII"],"required":true}
{"type":"linear_scale","label":"Seberapa puas kamu?","scale":{"min":1,"max":5,"minLabel":"Tidak puas","maxLabel":"Sangat puas"}}

PERMINTAAN SAYA:
(tulis di sini form yang kamu mau, misalnya: "Kuis 10 soal pilihan ganda tentang sejarah Indonesia untuk kelas XI")`;

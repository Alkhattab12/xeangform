import { z } from "zod";

export const FIELD_TYPES = [
  "short_text", "long_text", "email", "phone", "number", "url",
  "radio", "checkbox", "dropdown", "linear_scale", "rating",
  "date", "time", "file", "section", "paragraph", "divider", "page_break", "consent",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FILE_CATEGORIES = ["pdf", "image", "document", "spreadsheet"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export type FormStatus = "draft" | "published" | "archived";

/** Kunci jawaban kuis. Tidak pernah dikirim ke halaman publik. */
export const answerKeySchema = z.object({
  optionIds: z.array(z.string().min(1).max(40)).max(100).optional(),
  text: z.array(z.string().max(200)).max(20).optional(),
  number: z.number().min(-1e12).max(1e12).optional(),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Pilihan huruf yang diizinkan (tidak ada font/CSS bebas dari pengguna). */
export const FONT_KEYS = ["grotesk", "rounded", "serif", "futuristic", "mono"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

/** Gaya per soal. Hanya nilai terbatas; bukan CSS bebas. */
export const fieldStyleSchema = z.object({
  bg: hex.optional(),
  fg: hex.optional(),
  line: hex.optional(),
  radius: z.number().int().min(0).max(32).optional(),
  shadow: z.number().int().min(0).max(12).optional(),
  font: z.enum(FONT_KEYS).optional(),
  labelSize: z.enum(["sm", "md", "lg"]).optional(),
});
export type FieldStyle = z.infer<typeof fieldStyleSchema>;

export const fieldSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(FIELD_TYPES),
  label: z.string().max(2000),
  description: z.string().max(1000).optional(),
  required: z.boolean(),
  placeholder: z.string().max(200).optional(),
  options: z
    .array(z.object({ id: z.string().min(1).max(40), label: z.string().max(200) }))
    .max(100)
    .optional(),
  allowOther: z.boolean().optional(),
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(0).max(10000).optional(),
  min: z.number().min(-1e12).max(1e12).optional(),
  max: z.number().min(-1e12).max(1e12).optional(),
  scale: z
    .object({
      min: z.number().int().min(0).max(1),
      max: z.number().int().min(2).max(10),
      minLabel: z.string().max(60).optional(),
      maxLabel: z.string().max(60).optional(),
    })
    .optional(),
  ratingMax: z.number().int().min(3).max(10).optional(),
  file: z
    .object({
      accept: z.array(z.enum(FILE_CATEGORIES)).max(4),
      maxSizeMb: z.number().min(1).max(25),
      maxFiles: z.number().int().min(1).max(10),
    })
    .optional(),
  answerKey: answerKeySchema.optional(),
  style: fieldStyleSchema.optional(),
});
export type FormField = z.infer<typeof fieldSchema>;

export const formSchemaJson = z
  .object({ fields: z.array(fieldSchema).max(100) })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.fields.forEach((f, i) => {
      if (seen.has(f.id)) ctx.addIssue({ code: "custom", message: "ID kolom duplikat.", path: ["fields", i, "id"] });
      seen.add(f.id);
    });
  });

export const AUDIO_START_MODES = ["first_interaction", "manual_play"] as const;
export type AudioStartMode = (typeof AUDIO_START_MODES)[number];

export const AUDIO_PLAYER_STYLES = ["floating_pill", "bottom_dock", "header_badge", "minimal_icon"] as const;
export type AudioPlayerStyle = (typeof AUDIO_PLAYER_STYLES)[number];

export const audioSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  trackId: z.string().default("lofi-focus"),
  customUrl: z.string().max(1000).optional(),
  title: z.string().max(100).default("Midnight Study Lo-Fi"),
  artist: z.string().max(100).default("Xeangform Soundscape"),
  sourceUrl: z.string().max(500).optional(),
  license: z.string().max(100).default("CC0 Public Domain"),
  duration: z.number().min(0).max(3600).optional(),
  volume: z.number().int().min(0).max(100).default(35),
  loop: z.boolean().default(true),
  startMode: z.enum(AUDIO_START_MODES).default("first_interaction"),
  stopOnSubmit: z.boolean().default(true),
  playerStyle: z.enum(AUDIO_PLAYER_STYLES).default("floating_pill"),
  sfxEnabled: z.boolean().default(true),
});
export type AudioSettings = z.infer<typeof audioSettingsSchema>;

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: false,
  trackId: "lofi-focus",
  customUrl: "",
  title: "Midnight Study Lo-Fi",
  artist: "Xeangform Soundscape",
  sourceUrl: "",
  license: "CC0 Public Domain",
  duration: 6,
  volume: 35,
  loop: true,
  startMode: "first_interaction",
  stopOnSubmit: true,
  playerStyle: "floating_pill",
  sfxEnabled: true,
};

/** Pengaturan tingkat form (disimpan di forms.settings_json). */
export const formSettingsSchema = z.object({
  quiz: z.boolean().default(false),
  allowTabSwitch: z.boolean().default(true),
  oneResponsePerAccount: z.boolean().default(false),
  audio: audioSettingsSchema.default(DEFAULT_AUDIO_SETTINGS),
});
export type FormSettings = z.infer<typeof formSettingsSchema>;
export const DEFAULT_SETTINGS: FormSettings = {
  quiz: false,
  allowTabSwitch: true,
  oneResponsePerAccount: false,
  audio: DEFAULT_AUDIO_SETTINGS,
};

export function parseSettings(v: unknown): FormSettings {
  const r = formSettingsSchema.safeParse(v ?? {});
  return r.success ? r.data : DEFAULT_SETTINGS;
}

export const THEME_PRESETS = ["unik", "keren", "abstrak", "neo", "imut", "cooking", "galaxy", "kebumian", "biologi", "sosial"] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];
export const DECOR_KEYS = ["none", "dots", "grid", "stars", "shapes", "strata", "cells", "bubbles"] as const;
export type DecorKey = (typeof DECOR_KEYS)[number];

/** Tema form (disimpan di forms.theme_json). Kosong ({}) = tampilan bawaan. */
export const formThemeSchema = z.object({
  preset: z.enum(THEME_PRESETS),
  bg: hex.optional(),
  surface: hex.optional(),
  fg: hex.optional(),
  accent: hex.optional(),
  radius: z.number().int().min(0).max(32).optional(),
  border: z.number().int().min(1).max(5).optional(),
  shadow: z.number().int().min(0).max(12).optional(),
  font: z.enum(FONT_KEYS).optional(),
  decor: z.enum(DECOR_KEYS).optional(),
});
export type FormTheme = z.infer<typeof formThemeSchema>;

/** theme_json kosong atau tidak valid -> null (tampilan bawaan). */
export function themeFromJson(v: unknown): FormTheme | null {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v as object).length === 0) return null;
  const r = formThemeSchema.safeParse(v);
  return r.success ? r.data : null;
}

const GRADABLE = new Set<FieldType>(["radio", "dropdown", "checkbox", "short_text", "number"]);
export const isGradable = (t: FieldType) => GRADABLE.has(t);

/** Soal dinilai hanya jika kuncinya lengkap dan opsinya masih ada. */
export function hasAnswerKey(f: FormField): boolean {
  const k = f.answerKey;
  if (!k || !GRADABLE.has(f.type)) return false;
  const ids = k.optionIds ?? [];
  const exists = (id: string) => (f.options ?? []).some((o) => o.id === id);
  switch (f.type) {
    case "radio":
    case "dropdown":
      return ids.length === 1 && exists(ids[0]);
    case "checkbox":
      return ids.length > 0 && ids.every(exists);
    case "short_text":
      return (k.text ?? []).some((t) => t.trim() !== "");
    case "number":
      return typeof k.number === "number";
    default:
      return false;
  }
}

const LAYOUT_TYPES = new Set<FieldType>(["section", "paragraph", "divider", "page_break"]);
export const isInputType = (t: FieldType) => !LAYOUT_TYPES.has(t);

/** Syarat minimal agar form boleh diterbitkan. Draft boleh belum lengkap. */
export function publishIssues(fields: FormField[], settings: FormSettings = DEFAULT_SETTINGS): string[] {
  const issues: string[] = [];
  if (!fields.some((f) => isInputType(f.type))) issues.push("Tambahkan minimal satu kolom pertanyaan.");
  fields.forEach((f, i) => {
    if (f.type === "divider" || f.type === "page_break") return;
    const name = `Kolom ${i + 1}`;
    if (!f.label.trim()) issues.push(`${name} belum punya judul.`);
    if (f.type === "radio" || f.type === "checkbox" || f.type === "dropdown") {
      const opts = f.options ?? [];
      if (opts.length < 1) issues.push(`${name} butuh minimal satu opsi.`);
      else if (opts.some((o) => !o.label.trim())) issues.push(`${name} punya opsi yang kosong.`);
    }
    if (f.type === "file" && (f.file?.accept.length ?? 0) < 1) issues.push(`${name}: pilih minimal satu tipe file.`);
  });
  if (settings.quiz && !fields.some(hasAnswerKey)) {
    issues.push("Mode kuis aktif, tapi belum ada soal yang punya kunci jawaban.");
  }
  return issues;
}

import { z } from "zod";

export const FIELD_TYPES = [
  "short_text", "long_text", "email", "phone", "number", "url",
  "radio", "checkbox", "dropdown", "linear_scale", "rating",
  "date", "time", "file", "section", "paragraph", "divider", "consent",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FILE_CATEGORIES = ["pdf", "image", "document", "spreadsheet"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export type FormStatus = "draft" | "published" | "archived";

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

const LAYOUT_TYPES = new Set<FieldType>(["section", "paragraph", "divider"]);
export const isInputType = (t: FieldType) => !LAYOUT_TYPES.has(t);

/** Syarat minimal agar form boleh diterbitkan. Draft boleh belum lengkap. */
export function publishIssues(fields: FormField[]): string[] {
  const issues: string[] = [];
  if (!fields.some((f) => isInputType(f.type))) issues.push("Tambahkan minimal satu kolom pertanyaan.");
  fields.forEach((f, i) => {
    if (f.type === "divider") return;
    const name = `Kolom ${i + 1}`;
    if (!f.label.trim()) issues.push(`${name} belum punya judul.`);
    if (f.type === "radio" || f.type === "checkbox" || f.type === "dropdown") {
      const opts = f.options ?? [];
      if (opts.length < 1) issues.push(`${name} butuh minimal satu opsi.`);
      else if (opts.some((o) => !o.label.trim())) issues.push(`${name} punya opsi yang kosong.`);
    }
    if (f.type === "file" && (f.file?.accept.length ?? 0) < 1) issues.push(`${name}: pilih minimal satu tipe file.`);
  });
  return issues;
}

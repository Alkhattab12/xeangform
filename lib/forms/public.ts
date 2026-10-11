import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formSchemaJson, parseSettings, themeFromJson, type FormField, type FormSettings, type FormTheme } from "./schema";

export type PublicForm = {
  id: string; // hanya dipakai di server (cek riwayat pengisian); jangan diteruskan ke komponen client
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  theme: FormTheme | null;
};

/** Hanya form berstatus "published". Kunci jawaban DIBUANG sebelum dikirim ke browser. */
export const getPublicForm = cache(async (slug: string): Promise<PublicForm | null> => {
  if (!/^[a-z0-9-]{6,64}$/.test(slug)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("forms")
    .select("id,title,description,schema_json,settings_json,theme_json")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Gagal memuat form.");
  if (!data) return null;
  const parsed = formSchemaJson.safeParse(data.schema_json);
  if (!parsed.success) return null;
  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description ?? "") as string,
    fields: parsed.data.fields.map((f) => {
      const copy: FormField = { ...f };
      delete copy.answerKey;
      return copy;
    }),
    settings: parseSettings(data.settings_json),
    theme: themeFromJson(data.theme_json),
  };
});

/** Apakah akun ini sudah pernah mengisi form ini? (untuk pembatasan 1 respons per akun) */
export async function findPriorSubmission(formId: string, userId: string): Promise<{ score: { correct: number; total: number } | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("form_submissions")
    .select("id,metadata_json")
    .eq("form_id", formId)
    .eq("respondent_id", userId)
    .limit(1);
  if (error) throw new Error("Gagal memeriksa riwayat pengisian.");
  if (!data || data.length === 0) return null;
  const m = data[0].metadata_json as { score?: { correct: number; total: number } } | null;
  return { score: m?.score ?? null };
}

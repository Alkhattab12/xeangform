import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formSchemaJson, type FormField } from "./schema";

export type PublicForm = { title: string; description: string; fields: FormField[] };

/** Hanya form berstatus "published". Hanya field yang aman dikirim ke browser. */
export const getPublicForm = cache(async (slug: string): Promise<PublicForm | null> => {
  if (!/^[a-z0-9-]{6,64}$/.test(slug)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("forms")
    .select("title,description,schema_json")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Gagal memuat form.");
  if (!data) return null;
  const parsed = formSchemaJson.safeParse(data.schema_json);
  if (!parsed.success) return null;
  return { title: data.title as string, description: (data.description ?? "") as string, fields: parsed.data.fields };
});

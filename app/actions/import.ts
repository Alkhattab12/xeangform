"use server";

import { customAlphabet } from "nanoid";
import { MAX_IMPORT_BYTES, parseImport } from "@/lib/forms/portable";
import { createClient } from "@/lib/supabase/server";

const makeSlug = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export type ImportResult = { ok: true; id: string } | { ok: false; errors: string[] };

export async function importForm(text: string): Promise<ImportResult> {
  if (typeof text !== "string" || text.length > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ["Isi terlalu besar (maksimal 500 KB)."] };
  }
  const parsed = parseImport(text); // validasi ulang di server; jangan percaya pratinjau browser
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: ["Sesi berakhir. Muat ulang halaman lalu masuk kembali."] };

  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase
      .from("forms")
      .insert({
        owner_id: user.id,
        slug: makeSlug(),
        title: parsed.form.title,
        description: parsed.form.description || null,
        schema_json: { fields: parsed.form.fields },
        settings_json: parsed.form.settings,
        theme_json: parsed.form.theme ?? {},
        status: "draft", // hasil impor selalu draft; kamu cek dulu sebelum menerbitkan
      })
      .select("id")
      .single();
    if (data) return { ok: true, id: data.id };
    if (error?.code !== "23505") break;
  }
  return { ok: false, errors: ["Gagal menyimpan form. Coba lagi."] };
}

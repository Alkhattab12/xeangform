import { z } from "zod";
import { buildExport } from "@/lib/forms/portable";
import { formSchemaJson, parseSettings, themeFromJson } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Tidak ditemukan", { status: 404 });

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return new Response("Belum masuk", { status: 401 });

  // RLS + filter owner: hanya form milik sendiri
  const { data } = await supabase
    .from("forms")
    .select("title,description,schema_json,settings_json,theme_json")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) return new Response("Tidak ditemukan", { status: 404 });

  const parsed = formSchemaJson.safeParse(data.schema_json);
  if (!parsed.success) return new Response("Struktur form rusak", { status: 500 });

  const payload = buildExport(data.title as string, (data.description ?? "") as string, parsed.data.fields, parseSettings(data.settings_json), themeFromJson(data.theme_json));
  const base = (data.title as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "form";
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.syamil-form.json"`,
      "Cache-Control": "no-store",
    },
  });
}

import { z } from "zod";
import { buildCsv } from "@/lib/forms/csv";
import { loadResponses, parseFilters } from "@/lib/forms/responses";
import { formSchemaJson, parseSettings } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export const dynamic = "force-dynamic";
const EXPORT_CAP = 5000;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Tidak ditemukan", { status: 404 });

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return new Response("Belum masuk", { status: 401 });

  // RLS + filter owner: hanya form milik sendiri
  const { data: form } = await supabase.from("forms").select("slug,schema_json,settings_json").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!form) return new Response("Tidak ditemukan", { status: 404 });

  const parsed = formSchemaJson.safeParse(form.schema_json);
  if (!parsed.success) return new Response("Struktur form rusak", { status: 500 });

  const filters = parseFilters(Object.fromEntries(new URL(req.url).searchParams));
  const res = await loadResponses(supabase, id, parsed.data.fields, filters, EXPORT_CAP);
  if (res.error) return new Response("Gagal memuat respons", { status: 500 });

  const settings = parseSettings(form.settings_json);
  const csv = buildCsv(parsed.data.fields, res.rows, {
    quiz: settings.quiz,
    proctor: !settings.allowTabSwitch || settings.proctoring.enabled || settings.timeLimit.enabled,
    accounts: settings.oneResponsePerAccount,
  });
  const stamp = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="respons-${form.slug as string}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

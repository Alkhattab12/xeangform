"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/app/actions/notifications";
import { formSchemaJson, formSettingsSchema, formThemeSchema, parseSettings, publishIssues, type FormStatus } from "@/lib/forms/schema";

const makeSlug = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const idSchema = z.string().uuid();
const statusSchema = z.enum(["draft", "published", "archived"]);

export type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string };
export type StatusResult = { ok: true; status: FormStatus } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const toDashboardError = (msg: string) => `/dashboard?error=${encodeURIComponent(msg)}`;

export async function createForm(): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/masuk");

  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase
      .from("forms")
      .insert({ owner_id: user.id, slug: makeSlug() })
      .select("id")
      .single();
    if (data) redirect(`/dashboard/forms/${data.id}`);
    if (error?.code !== "23505") break; // 23505 = slug bentrok, coba lagi
  }
  redirect(toDashboardError("Gagal membuat form. Coba lagi."));
}

const saveSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  schema: formSchemaJson,
  settings: formSettingsSchema,
  theme: formThemeSchema.nullable(),
});

export async function saveForm(id: string, input: unknown): Promise<SaveResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Form tidak valid." };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Data form tidak valid. Periksa batas panjang atau angka di pengaturan kolom." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Muat ulang halaman lalu masuk kembali." };

  // Hanya kolom ini yang boleh diubah dari editor (slug/status/owner tidak bisa disusupi)
  const { data, error } = await supabase
    .from("forms")
    .update({
      title: parsed.data.title.trim() || "Form Tanpa Judul",
      description: parsed.data.description.trim() || null,
      schema_json: parsed.data.schema,
      settings_json: parsed.data.settings,
      theme_json: parsed.data.theme ?? {},
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("updated_at")
    .maybeSingle();

  if (error) return { ok: false, error: "Gagal menyimpan ke database. Coba lagi." };
  if (!data) return { ok: false, error: "Form tidak ditemukan atau bukan milikmu." };
  return { ok: true, updatedAt: data.updated_at };
}

export async function setFormStatus(id: string, status: FormStatus): Promise<StatusResult> {
  if (!idSchema.safeParse(id).success || !statusSchema.safeParse(status).success) {
    return { ok: false, error: "Permintaan tidak valid." };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Muat ulang halaman lalu masuk kembali." };

  let formTitle = "Formulir";
  if (status === "published") {
    const { data: row, error: e1 } = await supabase
      .from("forms")
      .select("title,schema_json,settings_json")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (e1 || !row) return { ok: false, error: "Form tidak ditemukan." };
    formTitle = row.title || "Formulir";
    const parsed = formSchemaJson.safeParse(row.schema_json);
    if (!parsed.success) return { ok: false, error: "Struktur form rusak. Buka editor lalu simpan ulang." };
    const issues = publishIssues(parsed.data.fields, parseSettings(row.settings_json));
    if (issues.length) {
      const more = issues.length > 2 ? ` (+${issues.length - 2} masalah lain)` : "";
      return { ok: false, error: issues.slice(0, 2).join(" ") + more };
    }
  }

  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("forms")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("status")
    .maybeSingle();
  if (error) return { ok: false, error: "Gagal mengubah status. Coba lagi." };
  if (!data) return { ok: false, error: "Form tidak ditemukan atau bukan milikmu." };

  if (status === "published") {
    try {
      await createNotification({
        userId: user.id,
        type: "system",
        title: "Formulir Berhasil Diterbitkan",
        message: `Formulir "${formTitle}" kini telah dipublikasikan dan siap menerima respons dari publik.`,
        link: `/dashboard/forms/${id}`,
        metadata: { formId: id },
      });
    } catch (notifErr) {
      console.error("publish_notification_failed", notifErr);
    }
  }

  return { ok: true, status };
}

function readId(fd: FormData): string | null {
  const v = fd.get("id");
  return typeof v === "string" && idSchema.safeParse(v).success ? v : null;
}

/** Dipakai tombol di daftar dashboard (form action). */
export async function setStatusAction(fd: FormData): Promise<void> {
  const id = readId(fd);
  const status = statusSchema.safeParse(fd.get("status"));
  if (!id || !status.success) redirect(toDashboardError("Permintaan tidak valid."));
  const res = await setFormStatus(id, status.data);
  revalidatePath("/dashboard");
  if (!res.ok) redirect(toDashboardError(res.error));
}

export async function deleteFormAction(fd: FormData): Promise<void> {
  const id = readId(fd);
  if (!id) redirect(toDashboardError("Permintaan tidak valid."));
  const { supabase, user } = await requireUser();
  if (!user) redirect("/masuk");
  const { error } = await supabase.from("forms").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/dashboard");
  if (error) redirect(toDashboardError("Gagal menghapus form."));
}

export async function duplicateFormAction(fd: FormData): Promise<void> {
  const id = readId(fd);
  if (!id) redirect(toDashboardError("Permintaan tidak valid."));
  const { supabase, user } = await requireUser();
  if (!user) redirect("/masuk");

  const { data: src } = await supabase
    .from("forms")
    .select("title,description,schema_json,theme_json,settings_json")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!src) redirect(toDashboardError("Form tidak ditemukan."));

  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase
      .from("forms")
      .insert({
        owner_id: user.id,
        slug: makeSlug(),
        title: `${src.title} (salinan)`.slice(0, 200),
        description: src.description,
        schema_json: src.schema_json,
        theme_json: src.theme_json,
        settings_json: src.settings_json,
        status: "draft",
      })
      .select("id")
      .single();
    if (data) {
      revalidatePath("/dashboard");
      redirect(`/dashboard/forms/${data.id}`);
    }
    if (error?.code !== "23505") break;
  }
  redirect(toDashboardError("Gagal menduplikasi form."));
}

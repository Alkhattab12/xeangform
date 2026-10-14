"use server";

import { customAlphabet } from "nanoid";
import { z } from "zod";
import { isAllowedFile } from "@/lib/forms/files";
import { getClientIpHash } from "@/lib/forms/client-ip";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { formSchemaJson, parseSettings, type FormField } from "@/lib/forms/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
const slugSchema = z.string().regex(/^[a-z0-9-]{6,64}$/);
const fileInfoSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export type PrepareUploadResult =
  | { ok: true; signedUrl: string; token: string; storagePath: string }
  | { ok: false; error: string };

export type DownloadUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return clean.slice(-80);
}

/**
 * Membuat Signed Upload URL aman di Supabase Storage untuk formulir publik.
 * Memvalidasi kepemilikan form, batas ukuran per soal, dan tipe file yang diizinkan.
 */
export async function prepareFileUpload(
  slug: string,
  fieldId: string,
  input: unknown,
): Promise<PrepareUploadResult> {
  if (!slugSchema.safeParse(slug).success) {
    return { ok: false, error: "Form tidak valid." };
  }
  const parsedInfo = fileInfoSchema.safeParse(input);
  if (!parsedInfo.success) {
    return { ok: false, error: "Informasi berkas tidak valid." };
  }
  const { filename, mimeType, sizeBytes } = parsedInfo.data;

  // Pembatas laju dasar per IP per form (penghambat penyalahgunaan storage)
  if (isRateLimited(`upload:${slug}:${await getClientIpHash()}`, 20, 60_000)) {
    return { ok: false, error: "Terlalu banyak permintaan unggah. Tunggu sebentar lalu coba lagi." };
  }

  try {
    const admin = createAdminClient();

    // 1. Periksa form yang berstatus published
    const { data: form, error: formErr } = await admin
      .from("forms")
      .select("id,status,schema_json,settings_json")
      .eq("slug", slug)
      .maybeSingle();

    if (formErr || !form || form.status !== "published") {
      return { ok: false, error: "Form tidak menerima respons saat ini." };
    }

    // Form yang mewajibkan login (1 respons per akun) juga mewajibkan login untuk mengunggah berkas
    if (parseSettings(form.settings_json).oneResponsePerAccount) {
      const sb = await createClient();
      const user = await getVerifiedUser(sb);
      if (!user) return { ok: false, error: "Masuk dulu untuk mengunggah berkas pada form ini." };
    }

    // 2. Periksa skema dan temukan field tipe "file"
    const parsedSchema = formSchemaJson.safeParse(form.schema_json);
    if (!parsedSchema.success) {
      return { ok: false, error: "Struktur form tidak valid." };
    }

    const field = parsedSchema.data.fields.find((f: FormField) => f.id === fieldId);
    if (!field || field.type !== "file") {
      return { ok: false, error: "Kolom unggah berkas tidak ditemukan." };
    }

    // 3. Validasi awal ukuran (umpan balik cepat). Ukuran SEBENARNYA diverifikasi ulang di server saat respons dikirim,
    //    karena nilai ini hanya klaim dari browser.
    const maxSizeMb = field.file?.maxSizeMb ?? 10;
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      return { ok: false, error: `Ukuran berkas melebihi batas maksimal ${maxSizeMb} MB.` };
    }

    // 4. Validasi tipe berkas
    const allowedCategories = field.file?.accept ?? ["pdf", "image"];
    if (!isAllowedFile(filename, mimeType, allowedCategories)) {
      return { ok: false, error: `Format berkas "${filename}" tidak diizinkan untuk kolom ini.` };
    }

    // 5. Buat jalur penyimpanan unik dan aman di bucket privat
    const safeName = sanitizeFilename(filename);
    const storagePath = `${form.id}/${fieldId}/${nanoid()}_${safeName}`;

    // 6. Buat Signed Upload URL dari Supabase Storage
    const { data: uploadData, error: uploadErr } = await admin.storage
      .from("submission-files")
      .createSignedUploadUrl(storagePath);

    if (uploadErr || !uploadData) {
      console.error("createSignedUploadUrl error:", uploadErr);
      return { ok: false, error: "Gagal menyiapkan server unggahan. Coba lagi." };
    }

    return {
      ok: true,
      signedUrl: uploadData.signedUrl,
      token: uploadData.token,
      storagePath,
    };
  } catch (err) {
    console.error("prepareFileUpload exception:", err);
    return { ok: false, error: "Terjadi kesalahan saat memproses unggahan." };
  }
}

/**
 * Mendapatkan URL unduhan aman (Signed Download URL, berlaku 1 jam)
 * Khusus untuk pemilik formulir yang sedang login di dashboard.
 */
export async function getFileDownloadUrl(
  formId: string,
  storagePath: string,
): Promise<DownloadUrlResult> {
  // Path berkas harus berada di folder form ini (`<formId>/...`); cegah meminta berkas milik form lain
  if (
    !z.string().uuid().safeParse(formId).success ||
    typeof storagePath !== "string" ||
    !storagePath.startsWith(`${formId}/`) ||
    storagePath.includes("..") ||
    storagePath.length > 400
  ) {
    return { ok: false, error: "Berkas tidak valid." };
  }

  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);
    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu." };
    }

    // Verifikasi bahwa user adalah pemilik form
    const { data: form } = await supabase
      .from("forms")
      .select("id")
      .eq("id", formId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!form) {
      return { ok: false, error: "Akses ditolak atau formulir tidak ditemukan." };
    }

    // Buat signed URL berdurasi 1 jam
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("submission-files")
      .createSignedUrl(storagePath, 3600);

    if (error || !data) {
      return { ok: false, error: "Gagal membuat tautan unduhan berkas." };
    }

    return { ok: true, url: data.signedUrl };
  } catch {
    return { ok: false, error: "Gagal memproses permintaan unduhan." };
  }
}

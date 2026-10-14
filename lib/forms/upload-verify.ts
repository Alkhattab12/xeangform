import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedFile, type UploadedFile } from "./files";
import type { FormField } from "./schema";

const BUCKET = "submission-files";
// Bentuk nama yang dibuat prepareFileUpload: <nanoid 16>_<nama aman>
const NAME_RE = /^[a-z0-9]{16}_[A-Za-z0-9._-]{1,80}$/;

type Result = { ok: true; files: UploadedFile[] } | { ok: false; error: string };

/**
 * Memverifikasi berkas yang diklaim responden SEBELUM disimpan ke submission_files:
 *  - path harus `<formId>/<fieldId>/<nama>` (tidak boleh menunjuk berkas form/kolom lain),
 *  - berkas benar-benar ada di storage dan ukurannya diambil dari storage (bukan dari klaim klien),
 *  - ukuran nyata tidak melebihi batas kolom (berkas yang melanggar dihapus),
 *  - ekstensi sesuai kategori yang diizinkan, dan path belum dipakai respons lain.
 */
export async function verifyUploadedFiles(
  admin: SupabaseClient,
  formId: string,
  field: FormField,
  files: UploadedFile[],
): Promise<Result> {
  const prefix = `${formId}/${field.id}/`;
  const maxMb = field.file?.maxSizeMb ?? 10;
  const maxBytes = maxMb * 1024 * 1024;
  const categories = field.file?.accept ?? ["pdf", "image"];
  const seen = new Set<string>();
  const checked: UploadedFile[] = [];

  for (const f of files) {
    if (!f.storagePath.startsWith(prefix)) return { ok: false, error: "Berkas tidak valid untuk kolom ini." };
    const name = f.storagePath.slice(prefix.length);
    if (!NAME_RE.test(name) || seen.has(f.storagePath)) return { ok: false, error: "Berkas tidak valid untuk kolom ini." };
    seen.add(f.storagePath);

    // Ekstensi dicek dari nama berkas di storage (bukan dari mimeType klaim klien)
    if (!isAllowedFile(name, "", categories)) return { ok: false, error: "Format berkas tidak diizinkan untuk kolom ini." };

    const { data, error } = await admin.storage.from(BUCKET).list(`${formId}/${field.id}`, { limit: 5, search: name });
    if (error) return { ok: false, error: "Gagal memeriksa berkas. Coba kirim lagi." };
    const obj = data?.find((o) => o.name === name);
    const size = Number((obj?.metadata as { size?: number } | null | undefined)?.size);
    if (!obj || !Number.isFinite(size)) return { ok: false, error: "Berkas belum selesai diunggah. Unggah ulang lalu kirim lagi." };

    if (size > maxBytes) {
      await admin.storage.from(BUCKET).remove([f.storagePath]); // bersihkan berkas yang melanggar batas
      return { ok: false, error: `Ukuran file melebihi batas ${maxMb} MB.` };
    }

    const mime = (obj.metadata as { mimetype?: string } | null)?.mimetype;
    checked.push({
      storagePath: f.storagePath,
      originalFilename: f.originalFilename.trim().slice(0, 255) || name,
      mimeType: mime || f.mimeType,
      sizeBytes: size,
    });
  }

  if (checked.length > 0) {
    const { data: used, error } = await admin
      .from("submission_files")
      .select("storage_path")
      .in("storage_path", checked.map((c) => c.storagePath))
      .limit(1);
    if (error) return { ok: false, error: "Gagal memeriksa berkas. Coba kirim lagi." };
    if (used && used.length > 0) return { ok: false, error: "Berkas ini sudah dipakai pada respons lain. Unggah ulang." };
  }

  return { ok: true, files: checked };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type CleanupResult = {
  ok: boolean;
  scannedCount: number;
  candidateCount: number;
  deletedCount: number;
  deletedPaths: string[];
  error?: string;
};

const BUCKET = "submission-files";
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam

/**
 * Menghapus berkas yatim (orphan files) di bucket `submission-files`.
 * Berkas yatim adalah berkas yang:
 * 1. Tidak memiliki baris terkait di tabel `submission_files` (mis. pengerjaan form ditinggalkan/dibatalkan).
 * 2. Berumur lebih dari 24 jam sejak dibuat/diunggah.
 */
export async function cleanupOrphanFiles(
  client?: SupabaseClient,
  options: { dryRun?: boolean; maxAgeMs?: number } = {}
): Promise<CleanupResult> {
  const admin = client ?? createAdminClient();
  const maxAgeMs = options.maxAgeMs ?? ORPHAN_AGE_MS;
  const cutoff = Date.now() - maxAgeMs;

  const result: CleanupResult = {
    ok: true,
    scannedCount: 0,
    candidateCount: 0,
    deletedCount: 0,
    deletedPaths: [],
  };

  try {
    // 1. Ambil folder tingkat pertama (form_id)
    const { data: formFolders, error: formErr } = await admin.storage.from(BUCKET).list("", { limit: 500 });
    if (formErr) {
      return { ...result, ok: false, error: `Gagal membaca bucket: ${formErr.message}` };
    }

    const candidatePaths: string[] = [];

    for (const formFolder of formFolders ?? []) {
      // Lewati file di root (struktur harus form_id/field_id/file)
      if (formFolder.id !== null && !formFolder.metadata) {
        // Objek biasa di root
      }
      const formPath = formFolder.name;

      // 2. Ambil subfolder (field_id)
      const { data: fieldFolders } = await admin.storage.from(BUCKET).list(formPath, { limit: 500 });
      for (const fieldFolder of fieldFolders ?? []) {
        const fieldPath = `${formPath}/${fieldFolder.name}`;

        // 3. Ambil berkas-berkas di dalam folder kolom
        const { data: files } = await admin.storage.from(BUCKET).list(fieldPath, { limit: 500 });
        for (const file of files ?? []) {
          // Hanya proses file objek
          if (file.name.startsWith(".")) continue;
          result.scannedCount++;

          const createdAt = file.created_at ? Date.parse(file.created_at) : 0;
          if (createdAt > 0 && createdAt < cutoff) {
            candidatePaths.push(`${fieldPath}/${file.name}`);
          }
        }
      }
    }

    result.candidateCount = candidatePaths.length;
    if (candidatePaths.length === 0) {
      return result;
    }

    // 4. Periksa kecocokan di tabel submission_files (dalam batch 100)
    const orphans: string[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < candidatePaths.length; i += BATCH_SIZE) {
      const batch = candidatePaths.slice(i, i + BATCH_SIZE);
      const { data: matched, error: matchErr } = await admin
        .from("submission_files")
        .select("storage_path")
        .in("storage_path", batch);

      if (matchErr) {
        console.error("cleanup_match_error", matchErr.message);
        continue;
      }

      const registered = new Set((matched ?? []).map((m: { storage_path: string }) => m.storage_path));
      for (const path of batch) {
        if (!registered.has(path)) {
          orphans.push(path);
        }
      }
    }

    // 5. Hapus berkas yatim jika bukan dryRun
    if (!options.dryRun && orphans.length > 0) {
      for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
        const batch = orphans.slice(i, i + BATCH_SIZE);
        const { error: delErr } = await admin.storage.from(BUCKET).remove(batch);
        if (delErr) {
          console.error("cleanup_remove_error", delErr.message);
        } else {
          result.deletedCount += batch.length;
          result.deletedPaths.push(...batch);
        }
      }
    } else {
      result.deletedCount = orphans.length;
      result.deletedPaths = orphans;
    }

    return result;
  } catch (err) {
    console.error("cleanup_orphan_files_exception", err);
    return {
      ...result,
      ok: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal.",
    };
  }
}

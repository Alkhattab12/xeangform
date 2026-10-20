// Uji pembersihan berkas yatim (orphan file cleanup)
// Jalankan: npx tsx lib/forms/selftest-cleanup.ts
import assert from "node:assert/strict";
import { cleanupOrphanFiles } from "./cleanup-orphans";
import type { SupabaseClient } from "@supabase/supabase-js";

console.log("Menjalankan selftest pembersihan berkas yatim...");

const now = Date.now();
const oneHourAgoIso = new Date(now - 60 * 60 * 1000).toISOString();
const twoDaysAgoIso = new Date(now - 48 * 60 * 60 * 1000).toISOString();

// Mock storage files
const storageObjects: Record<string, { name: string; created_at: string }[]> = {
  "": [{ name: "form-uuid-1", created_at: twoDaysAgoIso }],
  "form-uuid-1": [{ name: "field-1", created_at: twoDaysAgoIso }],
  "form-uuid-1/field-1": [
    // Berkas 1: berumur 2 hari, terdaftar di DB (bukan yatim)
    { name: "file1_doc.pdf", created_at: twoDaysAgoIso },
    // Berkas 2: berumur 2 hari, TIDAK terdaftar di DB (berkas yatim -> harus dihapus)
    { name: "file2_orphan.pdf", created_at: twoDaysAgoIso },
    // Berkas 3: berumur 1 jam, TIDAK terdaftar di DB (belum 24 jam -> tidak boleh dihapus)
    { name: "file3_recent.pdf", created_at: oneHourAgoIso },
  ],
};

const registeredInDb = new Set(["form-uuid-1/field-1/file1_doc.pdf"]);
const deletedFromStorage: string[] = [];

const mockAdmin = {
  storage: {
    from: (bucket: string) => {
      assert.equal(bucket, "submission-files");
      return {
        list: async (path: string) => {
          return { data: storageObjects[path] ?? [], error: null };
        },
        remove: async (paths: string[]) => {
          deletedFromStorage.push(...paths);
          return { data: paths, error: null };
        },
      };
    },
  },
  from: (table: string) => {
    assert.equal(table, "submission_files");
    return {
      select: (cols: string) => ({
        in: async (colName: string, paths: string[]) => {
          assert.equal(colName, "storage_path");
          const matched = paths
            .filter((p) => registeredInDb.has(p))
            .map((p) => ({ storage_path: p }));
          return { data: matched, error: null };
        },
      }),
    };
  },
} as unknown as SupabaseClient;

// Jalankan cleanup
async function run() {
  const res = await cleanupOrphanFiles(mockAdmin);
  assert.equal(res.ok, true);
  assert.equal(res.scannedCount, 3);
  assert.equal(res.candidateCount, 2, "Hanya berkas berumur > 24 jam yang jadi kandidat");
  assert.equal(res.deletedCount, 1, "Hanya berkas yatim yang belum terdaftar di DB yang dihapus");
  assert.deepEqual(res.deletedPaths, ["form-uuid-1/field-1/file2_orphan.pdf"]);
  assert.deepEqual(deletedFromStorage, ["form-uuid-1/field-1/file2_orphan.pdf"]);

  console.log("selftest pembersihan berkas yatim lulus 100%");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Uji perbaikan keamanan. Jalankan: npx tsx --conditions react-server lib/forms/selftest-security.ts
// (--conditions react-server agar `import "server-only"` tidak melempar di luar Next.js)
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findUnsafeAudioSrc, isOwnedAudioPath, isSafeAudioSrc } from "@/lib/audio/safe-src";
import { uuidV5 } from "@/lib/notifications/ids";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { verifyUploadedFiles } from "@/lib/forms/upload-verify";
import type { FormField } from "@/lib/forms/schema";

// ---- Sumber audio
assert.equal(isSafeAudioSrc("/audio/tracks/lofi-focus.wav"), true);
assert.equal(isSafeAudioSrc("https://cdn.example.com/a.mp3"), true);
for (const bad of ["", "http://a.b/x.mp3", "//evil.com/x.mp3", "/\\evil.com", "javascript:alert(1)", "data:audio/mp3;base64,AAAA", "ftp://a.b/x"]) {
  assert.equal(isSafeAudioSrc(bad), false, `harus ditolak: ${bad}`);
}
assert.equal(findUnsafeAudioSrc({ customUrl: "", playlist: [{ src: "/a.wav" }, { src: "https://x.y/z.mp3" }] }), null);
assert.equal(findUnsafeAudioSrc({ playlist: [{ src: "/a.wav" }, { src: "http://x.y/z.mp3" }] }), "http://x.y/z.mp3");
assert.equal(findUnsafeAudioSrc({ customUrl: "javascript:1", playlist: [] }), "javascript:1");

// ---- Path audio milik user
assert.equal(isOwnedAudioPath("u1/abc_lagu.mp3", "u1"), true);
for (const bad of ["u2/abc.mp3", "u1/../u2/abc.mp3", "u1/sub/abc.mp3", "u1//abc.mp3", "u1/.hidden", "u1/", "u1/..", "u1\\abc.mp3", "u1"]) {
  assert.equal(isOwnedAudioPath(bad, "u1"), false, `harus ditolak: ${bad}`);
}

// ---- UUID v5 (vektor uji dicocokkan dengan uuid.uuid5 Python: DNS namespace + "www.example.com")
assert.equal(uuidV5("www.example.com"), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
assert.equal(uuidV5("announce:u1:x"), uuidV5("announce:u1:x"));
assert.notEqual(uuidV5("announce:u1:x"), uuidV5("announce:u2:x"));

// ---- Rate limit
const k = `t:${Math.random()}`;
for (let i = 0; i < 3; i++) assert.equal(isRateLimited(k, 3, 60_000), false);
assert.equal(isRateLimited(k, 3, 60_000), true);
assert.equal(isRateLimited(`${k}:lain`, 3, 60_000), false);

// ---- verifyUploadedFiles dengan storage tiruan
const FORM = "11111111-1111-4111-8111-111111111111";
const field = { id: "f1", type: "file", label: "Foto", required: false, file: { maxSizeMb: 1, accept: ["image"], maxFiles: 2 } } as unknown as FormField;
const NAME = "abcdefghij123456_foto.png";

function mkAdmin(objects: { folder: string; name: string; size: number }[], used: string[] = []) {
  const removed: string[] = [];
  const admin = {
    storage: {
      from: () => ({
        list: async (folder: string, opts: { search: string }) => ({
          data: objects.filter((o) => o.folder === folder && o.name.includes(opts.search)).map((o) => ({ name: o.name, metadata: { size: o.size, mimetype: "image/png" } })),
          error: null,
        }),
        remove: async (paths: string[]) => {
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
    from: () => ({ select: () => ({ in: (_c: string, paths: string[]) => ({ limit: async () => ({ data: used.filter((u) => paths.includes(u)).map((storage_path) => ({ storage_path })), error: null }) }) }) }),
  } as unknown as SupabaseClient;
  return { admin, removed };
}
const claim = (path: string, size = 1) => ({ storagePath: path, originalFilename: "foto.png", mimeType: "image/png", sizeBytes: size });
const good = `${FORM}/f1/${NAME}`;
const present = [{ folder: `${FORM}/f1`, name: NAME, size: 5000 }];

(async () => {
  // Berkas sah: ukuran diambil dari storage, bukan dari klaim klien (klaim 1 byte)
  let r = await verifyUploadedFiles(mkAdmin(present).admin, FORM, field, [claim(good, 1)]);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.files[0].sizeBytes, 5000);

  // Path milik form lain / kolom lain ditolak
  const other = "22222222-2222-4222-8222-222222222222";
  r = await verifyUploadedFiles(mkAdmin(present).admin, FORM, field, [claim(`${other}/f1/${NAME}`)]);
  assert.equal(r.ok, false);
  r = await verifyUploadedFiles(mkAdmin(present).admin, FORM, field, [claim(`${FORM}/f2/${NAME}`)]);
  assert.equal(r.ok, false);
  r = await verifyUploadedFiles(mkAdmin(present).admin, FORM, field, [claim(`${FORM}/f1/../f2/${NAME}`)]);
  assert.equal(r.ok, false);

  // Berkas tidak ada di storage
  r = await verifyUploadedFiles(mkAdmin([]).admin, FORM, field, [claim(good)]);
  assert.equal(r.ok, false);

  // Ukuran nyata melebihi batas -> ditolak dan berkas dihapus
  const big = mkAdmin([{ folder: `${FORM}/f1`, name: NAME, size: 5 * 1024 * 1024 }]);
  r = await verifyUploadedFiles(big.admin, FORM, field, [claim(good, 10)]);
  assert.equal(r.ok, false);
  assert.deepEqual(big.removed, [good]);

  // SVG tidak lagi diizinkan pada kategori gambar
  const svgName = "abcdefghij123456_x.svg";
  r = await verifyUploadedFiles(mkAdmin([{ folder: `${FORM}/f1`, name: svgName, size: 10 }]).admin, FORM, field, [claim(`${FORM}/f1/${svgName}`)]);
  assert.equal(r.ok, false);

  // Path ganda dalam satu kiriman, dan path yang sudah dipakai respons lain
  r = await verifyUploadedFiles(mkAdmin(present).admin, FORM, field, [claim(good), claim(good)]);
  assert.equal(r.ok, false);
  r = await verifyUploadedFiles(mkAdmin(present, [good]).admin, FORM, field, [claim(good)]);
  assert.equal(r.ok, false);

  console.log("semua uji keamanan lulus");
})();

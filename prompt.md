PERAN
Kamu adalah engineer senior yang memperbaiki repo `Alkhattab12/xeangform` (Next.js + Supabase, deploy di Vercel). Bahasa komunikasi: Indonesia. Jelaskan setiap langkah dengan rinci sebelum dan sesudah mengubah kode.

KONTEKS (JANGAN AUDIT ULANG DARI AWAL)
- Branch `main`, commit terakhir `ff8aa18`. Fitur batas waktu ujian, seeded shuffle, dan banner "wajibkan login" SUDAH ADA dan jalan. Jangan tulis ulang.
- File yang tidak boleh diubah logikanya: `app/actions/proctoring.ts`, `app/actions/submit.ts`, `lib/forms/time-limit.ts`, `lib/forms/shuffle.ts`.
- Domain produksi: form.xeandigital.web.id. Database produksi: Supabase project `supabase-cerise-ribbon` (ref `dkzarupvcptreogrvgcv`).
- Baca hanya file yang disebut di tiap tugas. Setelah semua tugas selesai jalankan `npx tsc --noEmit` dan `node ./scripts/lint.js`; keduanya harus lulus.

ATURAN KERAS
1. JANGAN menjalankan SQL ke database produksi dan jangan memakai konektor Supabase untuk menulis. Migrasi cukup dibuat sebagai FILE di repo; saya yang menerapkannya.
2. JANGAN menambah, menjalankan, atau memperluas Playwright/test E2E. Saya menguji sendiri.
3. Satu commit per tugas, pesan commit bahasa Indonesia gaya `fix(scope): ringkasan`. Push ke `main` hanya setelah tsc dan lint lulus.
4. Jika ada ambiguitas, berhenti dan tanya. Jangan menebak.

TUGAS 1 — Pulihkan proxy.ts (prioritas tertinggi)
Masalah: matcher di `proxy.ts` (root) dipersempit menjadi `["/dashboard/:path*", "/masuk", "/daftar"]`. Akibatnya peserta yang login di halaman `/f/...` tidak ter-refresh token Supabase-nya. Setelah sekitar 1 jam mereka bisa dianggap anonim, sehingga "1 respons per akun" dan blokir proctoring tertaut akun bisa gagal diam-diam.
Langkah:
a. Buka `proxy.ts` dan `lib/supabase/proxy.ts`. Pastikan `updateSession` sudah melewati `getUser()` untuk request TANPA cookie sesi Supabase (cookie berawalan `sb-` dan mengandung `-auth-token`). Seharusnya sudah ada; jangan ubah.
b. Kembalikan matcher ke versi luas:
   matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
c. Tambahkan komentar singkat di atas `config` yang menjelaskan: pengunjung anonim murah karena dilewati di dalam `updateSession`, sedangkan peserta login tetap di-refresh.
Kriteria selesai: matcher luas kembali, tidak ada perubahan lain di logika auth.

TUGAS 2 — Cron cleanup harus fail-closed
File: `app/api/cron/cleanup-orphans/route.ts`.
Masalah: pengecekan hanya `if (cronSecret && authHeader !== ...)`. Jika `CRON_SECRET` tidak diset di Vercel, endpoint terbuka untuk siapa pun padahal menghapus berkas di storage.
Perbaikan: jika `process.env.CRON_SECRET` kosong, kembalikan HTTP 500 dengan pesan "CRON_SECRET belum dikonfigurasi" dan JANGAN menjalankan `cleanupOrphanFiles`. Jika ada tapi header `authorization` tidak sama dengan `Bearer ${CRON_SECRET}`, kembalikan 401. Pertahankan dukungan `dryRun`.
Di akhir laporan, ingatkan saya untuk mengisi env `CRON_SECRET` di Vercel (Production) sebelum push, karena Vercel Cron otomatis mengirim header itu.

TUGAS 3 — Keluarkan Playwright dari `npm test`
File: `scripts/test-runner.js` dan `package.json`.
a. Hapus langkah nomor 6 ("Playwright Full E2E Test Suite") dari `scripts/test-runner.js`, termasuk teks pada banner akhir yang menyebut Playwright.
b. Di `package.json` tambahkan script terpisah `"test:e2e": "playwright test"`. Jangan hapus dependensi atau file `tests/e2e` dan `playwright.config.ts`.
c. Jangan menjalankan `npm install` atau mengubah `package-lock.json`.

TUGAS 4 — Perbaiki kilatan urutan acak di PublicForm
File: `components/public/PublicForm.tsx`.
Masalah: `shuffleSeed` memakai `sessionKey || "init"`, padahal `sessionKey` baru terisi setelah mount. Soal tampil dengan urutan seed "init", lalu berubah sekali setelah hidrasi.
Perbaikan:
a. Hitung `const shuffleOn = Boolean(settings.shuffle?.questions || settings.shuffle?.options)` dan `const orderReady = !shuffleOn || sessionKey !== ""`.
b. Letakkan early return `if (!orderReady) return <div className="nb-panel nb-panel-strong p-6" role="status" aria-busy="true">Menyiapkan formulir…</div>;` SETELAH semua hook, sebelum render form, dan setelah blok briefing/status lain. Pastikan tidak melanggar urutan hook React.
c. Jangan ubah perilaku seed saat `again()` (sesi baru = urutan baru).

TUGAS 5 — File migrasi untuk drift database (HANYA FILE, JANGAN DITERAPKAN)
a. Verifikasi `supabase/migrations/0011_storage_security_form_audio.sql` ada dan isinya: drop policy `form_audio_public_read`, lalu buat `form_audio_owner_select`. Jangan diubah.
b. Cari semua referensi `form_attempts` di repo (`grep -rn form_attempts`). Jika tidak ada satu pun referensi kode, buat `supabase/migrations/0012_drop_unused_form_attempts.sql` berisi:
   -- Tabel form_attempts tidak dipakai: batas waktu memakai proctoring_sessions.started_at
   drop table if exists public.form_attempts;
   Beri komentar di baris pertama bahwa file ini HARUS direview dulu karena bersifat destruktif. Jika ada referensi kode, berhenti dan laporkan.
c. JANGAN menjalankan migrasi apa pun.

LAPORAN AKHIR (WAJIB, RINCI)
Untuk setiap tugas: file yang diubah, ringkasan diff, alasan, hasil `tsc` dan lint, dan hash commit. Lalu daftar "tindakan manual untuk saya":
1. Isi env `CRON_SECRET` di Vercel Production.
2. Terapkan 0011 lalu 0012 di Supabase SQL Editor (0012 setelah saya cek).
3. Hapus project Vercel duplikat `xeangform-x2ge` (project `xeangform` yang melayani form.xeandigital.web.id harus dipertahankan).
4. Aktifkan "Leaked Password Protection" di Supabase Auth.

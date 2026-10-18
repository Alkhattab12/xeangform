# Uji visual (Chromium) dengan Supabase tiruan

Memverifikasi hal yang tidak tertangkap selftest: tampilan nyata di browser (dashboard, tombol ✦ latar, halaman Akun + logout,
editor, form publik bertema dinamis, "kurangi gerakan"). Mengukur posisi elemen yang beranimasi, bukan hanya mengecek class.

```
npm i -g playwright && npx playwright install chromium
# 1) build dengan URL Supabase tiruan (nilai NEXT_PUBLIC_* tertanam saat build)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy npx next build
# 2) jalankan tiruan + server, lalu uji
node scripts/visual/mock-supabase.js &
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy npx next start -p 3112 &
NODE_PATH=$(npm root -g) SHOT_DIR=./shots node scripts/visual/e2e-visual.js      # dashboard, ✦, Akun, editor, form publik, 404, halaman error
NODE_PATH=$(npm root -g) SHOT_DIR=./shots node scripts/visual/e2e-analytics.js   # donat Analitik + hitungan independen
NODE_PATH=$(npm root -g) SHOT_DIR=./shots node scripts/visual/e2e-resp.js         # halaman Respons, detail, 8 ekspor CSV
```
Data uji: form galaxy dinamis, form neo statis, dan "Kuis Matematika X" (28 respons: 3 kelas, 4 soal berkunci, 1 ditandai, 1 spam).
`e2e-analytics.js` dan `e2e-resp.js` menghitung ulang angka dari data mentah (`/__fixture`) tanpa memakai kode aplikasi, lalu membandingkannya.
Tips screenshot: jangan memotret elemen yang lebih tinggi dari layar dengan `locator.screenshot` (viewport berubah dan Recharts
menganimasikan ulang, hasilnya donat tampak kosong); pakai `page.screenshot` setelah scroll dan tunggu ±2 detik.

Catatan: `mock-supabase.js` hanya meniru `/auth/v1/user` dan REST sederhana (bukan layanan sungguhan). Sesi diberikan lewat cookie
`sb-127-auth-token`. Di lingkungan tanpa internet, `next build` gagal mengambil Google Fonts; ganti sementara `next/font/google`
dengan tiruan di salinan proyek (jangan di repo asli).

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
NODE_PATH=$(npm root -g) SHOT_DIR=./shots node scripts/visual/e2e-visual.js
```
Catatan: `mock-supabase.js` hanya meniru `/auth/v1/user` dan REST sederhana (bukan layanan sungguhan). Sesi diberikan lewat cookie
`sb-127-auth-token`. Di lingkungan tanpa internet, `next build` gagal mengambil Google Fonts; ganti sementara `next/font/google`
dengan tiruan di salinan proyek (jangan di repo asli).

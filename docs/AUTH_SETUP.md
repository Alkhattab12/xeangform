# Setup Autentikasi Xeangform (Supabase + Vercel)

Kode aplikasi tidak bisa memaksa pengaturan di dashboard Supabase. Daftar di bawah HARUS dicek manual.
Status verifikasi email selalu dibaca dari Supabase Auth (`email_confirmed_at`), tidak pernah dari tabel profil.

## 1. Supabase Dashboard → Authentication

| Pengaturan | Nilai | Kenapa |
|---|---|---|
| Providers → Email → **Confirm email** | **ON** | Tanpa ini akun baru langsung aktif tanpa konfirmasi. Kode hanya mencabut sesinya dan mencatat peringatan `auth_signup_session_issued`, tetapi dengan Confirm email OFF Supabase menandai email sebagai terverifikasi sejak awal, jadi konfirmasi tidak bisa dipaksakan dari kode. |
| URL Configuration → **Site URL** | domain produksi: `https://form.xeandigital.web.id` | Dasar tautan di email. |
| URL Configuration → **Redirect URLs** | `https://<domain-produksi>/auth/callback`, `http://localhost:3000/auth/callback`, dan pola preview Vercel bila dipakai | `emailRedirectTo` ditolak Supabase jika tidak ada di daftar ini. |
| SMTP Settings | SMTP kustom (Resend, Brevo, dll.) untuk produksi | SMTP bawaan Supabase dibatasi sangat ketat (beberapa email per jam) dan sering membuat email konfirmasi tidak sampai. |
| Password | minimal 8 karakter | Sama dengan validasi aplikasi (8–72). |

### Email template (opsional, agar tautan bisa dibuka di perangkat lain)
Tautan bawaan memakai PKCE: harus dibuka di browser yang sama dengan tempat mendaftar. Agar bisa lintas perangkat,
ganti tautan di template **Confirm signup** dengan (dan serupa untuk **Change email** `type=email_change`, **Reset password** `type=recovery`):

```
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Konfirmasi email</a>
```
`/auth/callback` mendukung kedua bentuk (`?code=` dan `?token_hash=&type=`).

## 2. Vercel → Environment Variables (Production dan Preview)

| Variabel | Catatan |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://form.xeandigital.web.id`. Dipakai sebagai cadangan URL redirect dan sebagai `metadataBase` pratinjau tautan (OpenGraph). Bawaan di `lib/site.ts` sama dengan domain ini. Perlu redeploy bila diubah (nilai tertanam saat build). |
| `NEXT_PUBLIC_SUPABASE_URL` | publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publik |
| `SUPABASE_SERVICE_ROLE_KEY` | RAHASIA. Tandai Sensitive, jangan pakai prefix `NEXT_PUBLIC_`, jangan di-commit |

## 3. Migrasi database (urut, jangan dilompati)
`supabase/migrations/0001` sampai `0006`. Migrasi **0005** (bucket + tabel audio) dan **0006** (tabel notifikasi) wajib terpasang
sebelum kode terbaru di-deploy: upload audio memakai sesi pengguna (policy storage dari 0005) dan panel notifikasi membaca tabel `notifications`.
Status terakhir diperiksa 15 Okt 2026: seluruh 0001–0006 sudah terpasang di project produksi (`supabase-cerise-ribbon`).
Migrasi produksi hanya dijalankan atas persetujuan pemilik proyek.

## 4. Alur yang diterapkan
- Daftar → `signUp` → email konfirmasi → `/auth/callback` → `/auth/terverifikasi` (hanya tampil jika backend menyatakan terverifikasi).
- Login akun belum terverifikasi ditolak (`email_not_confirmed`) dan sesi apa pun dicabut; ada tombol kirim ulang (jeda 60 dtk di UI dan server).
- Proxy memblokir `/dashboard/*` untuk akun belum terverifikasi; setiap server action dan route ekspor juga memeriksa lewat `getVerifiedUser()` (`lib/auth/verified-user.ts`).
- Akun terverifikasi login berikutnya tanpa email baru.

## 5. Pengujian
```
npx tsc --noEmit
npx tsx --tsconfig tsconfig.json lib/auth/selftest.ts
npx tsx --tsconfig tsconfig.json lib/background/selftest.ts
npx tsx --tsconfig tsconfig.json lib/notifications/selftest.ts
NODE_OPTIONS=--conditions=react-server npx tsx --tsconfig tsconfig.json lib/forms/selftest-security.ts
next build && bash scripts/e2e-smoke.sh      # uji asap tanpa backend sungguhan
```
Yang TIDAK bisa diuji otomatis tanpa project Supabase asli: pengiriman email nyata, klik tautan konfirmasi, pergantian email dan sandi end-to-end. Uji manual setelah deploy.

## 6. Header keamanan, pratinjau tautan, halaman 404/error
- `next.config.ts` memasang HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, serta `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`
  untuk semua rute KECUALI `/f/*` (form publik boleh disematkan lewat iframe). CSP berisi `script-src` sengaja belum dipasang: perlu nonce dan uji khusus.
- Pratinjau tautan (WhatsApp/Telegram/X): metadata di `app/layout.tsx` + `lib/site.ts`, gambar `public/og.png` (1200x630). Form publik memakai judul dan
  deskripsinya sendiri. Cek hasilnya dengan menempel tautan ke WhatsApp; cache pratinjau platform bisa tertunda.
- `app/not-found.tsx` (404 global) dan `app/error.tsx` (gangguan, mis. database tak terjangkau): halaman bermerek. Detail error server tidak ditampilkan ke pengunjung.

## 7. Keterbatasan yang diketahui
- Rate limit (`lib/forms/rate-limit.ts`) tersimpan di memori per instance serverless: penghambat dasar, bukan jaminan lintas instance.
- Preferensi background (gerak/diam) disimpan di `localStorage` per perangkat, belum disinkronkan ke profil.

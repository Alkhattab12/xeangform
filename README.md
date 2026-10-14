# Xeangform

Pembuat form (Next.js 16 + React 19 + Supabase). Antarmuka berbahasa Indonesia.

## Mulai
```
npm ci
cp .env.example .env.local   # isi variabel Supabase
npm run dev
```
Setup Supabase/Vercel (konfirmasi email, redirect URL, SMTP, env): lihat [`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md).

## Peta kode
- `app/actions/*` server action (auth, akun, form, respons, upload, audio, notifikasi). Semua yang privat memeriksa `getVerifiedUser()`.
- `lib/auth/*` helper autentikasi (status verifikasi, callback, origin aman). `lib/supabase/proxy.ts` melindungi `/dashboard`.
- `components/background/*` background global gerak/diam (`lib/background/mode.ts`, CSS `.xf-bg*` di `globals.css`).
- `supabase/migrations/*` skema; jalankan berurutan.

## Pengujian
```
npx tsc --noEmit
npx tsx --tsconfig tsconfig.json lib/auth/selftest.ts
npx tsx --tsconfig tsconfig.json lib/background/selftest.ts
npx tsx --tsconfig tsconfig.json lib/notifications/selftest.ts
npx tsx --tsconfig tsconfig.json lib/audio/selftest.ts
npx tsx --tsconfig tsconfig.json lib/analytics/selftest.ts
NODE_OPTIONS=--conditions=react-server npx tsx --tsconfig tsconfig.json lib/forms/selftest-security.ts
next build && bash scripts/e2e-smoke.sh
```

## Aturan kerja
- Jangan menjalankan migrasi/SQL produksi atau deploy produksi tanpa persetujuan pemilik proyek.
- Jangan melemahkan RLS atau pemeriksaan verifikasi email. Status verifikasi hanya dari `email_confirmed_at` Supabase Auth.
- Fungsi `"use server"` hanya untuk aksi yang boleh dipanggil dari browser; logika internal taruh di modul `server-only`.

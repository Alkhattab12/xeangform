-- Syamil Form — migrasi 0007: Preferensi Akun dan Background Animasi
-- Menambahkan kolom background_mode pada tabel profiles
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

alter table public.profiles
  add column if not exists background_mode text not null default 'motion' check (background_mode in ('motion', 'static'));

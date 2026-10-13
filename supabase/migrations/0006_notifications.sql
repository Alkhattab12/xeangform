-- Syamil Form — migrasi 0006: Sistem Notifikasi Terintegrasi (Notification Center)
-- Menyiapkan tabel notifikasi pengguna, indeks, Row Level Security, dan publikasi realtime.
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

-- 1. Tabel Notifikasi
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('form_response', 'product_update', 'system')),
  title         text not null check (char_length(title) <= 200),
  message       text not null check (char_length(message) <= 1000),
  link          text check (char_length(link) <= 500),
  is_read       boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

-- 2. Indeks untuk performa query daftar dan badge unread
create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

-- 3. Row Level Security
alter table public.notifications enable row level security;

-- Pengguna hanya dapat membaca notifikasi miliknya sendiri
create policy "notifications_user_select" on public.notifications
  for select
  using (user_id = auth.uid());

-- Pengguna hanya dapat memperbarui (status baca) notifikasi miliknya sendiri
create policy "notifications_user_update" on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pengguna hanya dapat menghapus notifikasi miliknya sendiri
create policy "notifications_user_delete" on public.notifications
  for delete
  using (user_id = auth.uid());

-- Pengguna terautentikasi dapat menyisipkan notifikasi untuk dirinya sendiri
create policy "notifications_user_insert" on public.notifications
  for insert
  with check (user_id = auth.uid());

-- 4. Publikasi Supabase Realtime (aman jika sudah ada / publikasi realtime aktif)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when others then
    -- Abaikan jika tabel sudah terdaftar atau publikasi belum aktif di database
    null;
end $$;

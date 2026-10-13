-- Syamil Form — migrasi 0005: Advanced Backsound Studio Storage & Audio Library
-- Menyiapkan bucket penyimpanan audio publik dan tabel pustaka audio pengguna.
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

-- 1. Bucket Storage untuk audio musik latar
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-audio',
  'form-audio',
  true,
  15728640, -- 15 MB
  array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
)
on conflict (id) do nothing;

-- 2. Kebijakan Storage untuk form-audio
-- Responden publik dapat membaca dan memutar file audio tanpa harus login
create policy "form_audio_public_read" on storage.objects
  for select
  using (bucket_id = 'form-audio');

-- Pemilik yang terautentikasi dapat mengunggah file ke foldernya sendiri (prefix user_id)
create policy "form_audio_owner_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'form-audio' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pemilik dapat menghapus file miliknya
create policy "form_audio_owner_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'form-audio' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Tabel Pustaka Audio Pengguna (user_audio_tracks)
create table if not exists public.user_audio_tracks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) <= 120),
  artist       text not null default '' check (char_length(artist) <= 100),
  storage_path text not null unique,
  public_url   text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes >= 0),
  duration     double precision not null default 0 check (duration >= 0),
  format       text not null default 'unknown' check (format in ('mp3', 'wav', 'ogg', 'm4a', 'aac', 'unknown')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_user_audio_owner on public.user_audio_tracks (owner_id, created_at desc);

-- 4. Row Level Security untuk user_audio_tracks
alter table public.user_audio_tracks enable row level security;

create policy "user_audio_owner_all" on public.user_audio_tracks
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

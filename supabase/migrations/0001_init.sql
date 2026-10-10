-- Syamil Form — migrasi awal
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

create extension if not exists pgcrypto;

-- ============ Helper: updated_at ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============ profiles ============
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Buat profil otomatis saat user mendaftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ forms ============
create table public.forms (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null default 'Form Tanpa Judul' check (char_length(title) <= 200),
  description   text check (char_length(description) <= 2000),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{6,64}$'),
  status        text not null default 'draft' check (status in ('draft','published','archived')),
  schema_json   jsonb not null default '{"fields":[]}'::jsonb,
  theme_json    jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);
create index idx_forms_owner_updated on public.forms (owner_id, updated_at desc);
create index idx_forms_owner_status  on public.forms (owner_id, status);
create trigger trg_forms_updated before update on public.forms
  for each row execute function public.set_updated_at();

-- ============ form_submissions ============
create table public.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.forms(id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  answers_json  jsonb not null,
  metadata_json jsonb not null default '{}'::jsonb,
  status        text not null default 'received' check (status in ('received','flagged','spam'))
);
create index idx_submissions_form_time on public.form_submissions (form_id, submitted_at desc);

-- ============ submission_files ============
create table public.submission_files (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references public.form_submissions(id) on delete cascade,
  field_id          text not null,
  storage_path      text not null unique,
  original_filename text not null,
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes >= 0),
  created_at        timestamptz not null default now()
);
create index idx_files_submission on public.submission_files (submission_id);

-- ============ Row Level Security ============
alter table public.profiles          enable row level security;
alter table public.forms             enable row level security;
alter table public.form_submissions  enable row level security;
alter table public.submission_files  enable row level security;

-- profiles: hanya milik sendiri
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- forms: owner penuh. TIDAK ada akses anon;
-- form publik dibaca lewat server (service role) dengan kolom terbatas.
create policy "forms_owner_all" on public.forms for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- submissions: owner form boleh baca & hapus. INSERT hanya lewat server (service role).
create policy "submissions_owner_select" on public.form_submissions for select
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));
create policy "submissions_owner_delete" on public.form_submissions for delete
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

-- files: owner form boleh baca metadata
create policy "files_owner_select" on public.submission_files for select
  using (exists (
    select 1 from public.form_submissions s
    join public.forms f on f.id = s.form_id
    where s.id = submission_id and f.owner_id = auth.uid()
  ));

-- ============ Storage: bucket PRIVAT ============
insert into storage.buckets (id, name, public, file_size_limit)
values ('submission-files', 'submission-files', false, 26214400) -- 25 MB
on conflict (id) do nothing;
-- Sengaja TANPA policy untuk anon/authenticated:
-- upload & signed URL hanya dari server memakai service role,
-- setelah cek kepemilikan form.

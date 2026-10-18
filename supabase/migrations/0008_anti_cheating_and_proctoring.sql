-- Syamil Form — migrasi 0008: Sistem Anti-Cheating, Tab Lock, dan Sesi Pengawasan Ujian
-- Menyimpan sesi peserta, pencatatan log pelanggaran terstruktur, dan izin RLS untuk pemilik form.
-- Idempotent: aman dijalankan ulang. Policy memakai (select auth.uid()) agar tidak dievaluasi per baris.
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

-- 1. Sesi pengawasan
create table if not exists public.proctoring_sessions (
  id                uuid primary key default gen_random_uuid(),
  form_id           uuid not null references public.forms(id) on delete cascade,
  session_key       text not null,
  respondent_id     uuid references public.profiles(id) on delete set null,
  respondent_name   text,
  respondent_email  text,
  status            text not null default 'in_progress' check (status in ('in_progress', 'completed', 'blocked')),
  violation_count   integer not null default 0 check (violation_count >= 0),
  max_violations    integer not null default 3 check (max_violations between 1 and 10),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  last_violation_at timestamptz,
  metadata_json     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_proctoring_session unique (form_id, session_key)
);

create index if not exists idx_proctoring_sessions_form_status
  on public.proctoring_sessions (form_id, status, created_at desc);
create index if not exists idx_proctoring_sessions_key
  on public.proctoring_sessions (session_key);
create index if not exists idx_proctoring_sessions_respondent
  on public.proctoring_sessions (respondent_id);

drop trigger if exists trg_proctoring_sessions_updated on public.proctoring_sessions;
create trigger trg_proctoring_sessions_updated before update on public.proctoring_sessions
  for each row execute function public.set_updated_at();

-- 2. Log pelanggaran
create table if not exists public.proctoring_logs (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.proctoring_sessions(id) on delete cascade,
  form_id           uuid not null references public.forms(id) on delete cascade,
  violation_type    text not null check (violation_type in ('tab_switch', 'window_blur', 'fullscreen_exit', 'navigation_attempt', 'clipboard_restricted', 'other')),
  violation_number  integer not null check (violation_number >= 1),
  message           text not null check (char_length(message) <= 500),
  occurred_at       timestamptz not null default now(),
  details_json      jsonb not null default '{}'::jsonb
);

create index if not exists idx_proctoring_logs_session
  on public.proctoring_logs (session_id, occurred_at desc);
create index if not exists idx_proctoring_logs_form
  on public.proctoring_logs (form_id, occurred_at desc);

-- 3. Tipe notifikasi proctoring_violation (tanpa menelan error)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('form_response', 'product_update', 'system', 'proctoring_violation'));

-- 4. Row Level Security (RLS)
alter table public.proctoring_sessions enable row level security;
alter table public.proctoring_logs enable row level security;

drop policy if exists "proctoring_sessions_owner_select" on public.proctoring_sessions;
create policy "proctoring_sessions_owner_select" on public.proctoring_sessions
  for select
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())));

drop policy if exists "proctoring_sessions_owner_update" on public.proctoring_sessions;
create policy "proctoring_sessions_owner_update" on public.proctoring_sessions
  for update
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())));

drop policy if exists "proctoring_sessions_owner_delete" on public.proctoring_sessions;
create policy "proctoring_sessions_owner_delete" on public.proctoring_sessions
  for delete
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())));

drop policy if exists "proctoring_logs_owner_select" on public.proctoring_logs;
create policy "proctoring_logs_owner_select" on public.proctoring_logs
  for select
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())));

drop policy if exists "proctoring_logs_owner_delete" on public.proctoring_logs;
create policy "proctoring_logs_owner_delete" on public.proctoring_logs
  for delete
  using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = (select auth.uid())));

-- 5. Realtime (hanya tambah jika belum menjadi anggota publikasi)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'proctoring_sessions') then
    alter publication supabase_realtime add table public.proctoring_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'proctoring_logs') then
    alter publication supabase_realtime add table public.proctoring_logs;
  end if;
end $$;

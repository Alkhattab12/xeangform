-- Syamil Form — migrasi 0010: indeks pembatas pembuatan sesi proctoring per IP (hash) per form.
-- Idempotent. Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

create index if not exists idx_proctoring_sessions_ip_recent
  on public.proctoring_sessions (form_id, ((metadata_json ->> 'ip_hash')), created_at desc)
  where (metadata_json ->> 'ip_hash') is not null;

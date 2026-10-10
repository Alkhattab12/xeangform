-- Syamil Form — migrasi 0002
-- Mencegah respons ganda (kirim ulang/klik dua kali) dan mempercepat cek rate limit.
-- Jalankan di Supabase Dashboard > SQL Editor.

create unique index if not exists uq_submissions_client_key
  on public.form_submissions (form_id, (metadata_json->>'client_key'))
  where (metadata_json->>'client_key') is not null;

create index if not exists idx_submissions_ip_recent
  on public.form_submissions (form_id, (metadata_json->>'ip_hash'), submitted_at desc)
  where (metadata_json->>'ip_hash') is not null;

-- PERINGATAN: File migrasi ini bersifat destruktif dan HARUS direview terlebih dahulu sebelum diterapkan.
-- Tabel form_attempts tidak dipakai: batas waktu memakai proctoring_sessions.started_at
drop table if exists public.form_attempts;

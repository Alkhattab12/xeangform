-- Hardening fungsi (hasil saran Supabase advisor). Sudah dijalankan di project terhubung.
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

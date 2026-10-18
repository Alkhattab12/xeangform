-- Syamil Form — migrasi 0009: optimasi RLS (initplan)
-- Membungkus auth.uid() dengan (select ...) agar dievaluasi sekali per query, bukan per baris.
-- Logika akses tidak berubah. Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).

alter policy "profiles_select_own" on public.profiles
  using (id = (select auth.uid()));
alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "forms_owner_all" on public.forms
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

alter policy "submissions_owner_select" on public.form_submissions
  using (exists (select 1 from public.forms f where f.id = form_submissions.form_id and f.owner_id = (select auth.uid())));
alter policy "submissions_owner_delete" on public.form_submissions
  using (exists (select 1 from public.forms f where f.id = form_submissions.form_id and f.owner_id = (select auth.uid())));

alter policy "files_owner_select" on public.submission_files
  using (exists (
    select 1 from public.form_submissions s
    join public.forms f on f.id = s.form_id
    where s.id = submission_files.submission_id and f.owner_id = (select auth.uid())
  ));

alter policy "user_audio_owner_all" on public.user_audio_tracks
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

alter policy "notifications_user_select" on public.notifications
  using (user_id = (select auth.uid()));
alter policy "notifications_user_update" on public.notifications
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "notifications_user_delete" on public.notifications
  using (user_id = (select auth.uid()));
alter policy "notifications_user_insert" on public.notifications
  with check (user_id = (select auth.uid()));

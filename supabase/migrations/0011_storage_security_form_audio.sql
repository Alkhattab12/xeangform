-- Syamil Form — migrasi 0011: Keamanan Storage Bucket form-audio
-- Menghapus policy SELECT publik yang terlalu lebar pada storage.objects agar
-- pengguna tidak dapat me-listing seluruh isi bucket form-audio melalui API.
-- Akses streaming audio publik tetap berfungsi melalui Supabase Storage Public URL karena bucket disetel public = true.
-- Idempotent: aman dijalankan ulang.

drop policy if exists "form_audio_public_read" on storage.objects;

-- Pemilik yang terautentikasi dapat membaca/me-list file di foldernya sendiri (prefix user_id)
drop policy if exists "form_audio_owner_select" on storage.objects;
create policy "form_audio_owner_select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'form-audio' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );

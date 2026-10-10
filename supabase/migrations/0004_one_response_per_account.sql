-- Syamil Form — migrasi 0004: 1 respons per akun
alter table public.form_submissions
  add column if not exists respondent_id uuid references auth.users(id) on delete set null;

-- Satu akun hanya boleh punya satu respons per form (hanya berlaku jika respondent_id terisi)
create unique index if not exists uq_submissions_respondent
  on public.form_submissions (form_id, respondent_id)
  where respondent_id is not null;

create index if not exists idx_submissions_respondent
  on public.form_submissions (respondent_id)
  where respondent_id is not null;

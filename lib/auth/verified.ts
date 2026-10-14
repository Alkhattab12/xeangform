/**
 * Status verifikasi email berasal dari penyedia autentikasi (Supabase Auth: `email_confirmed_at`),
 * BUKAN dari tabel profil yang bisa dimanipulasi pengguna.
 */
export function isEmailVerified(user: { email_confirmed_at?: string | null } | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at);
}

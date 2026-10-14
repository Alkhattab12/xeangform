/** Pemetaan error Supabase Auth -> pesan pengguna. Membedakan kredensial salah dari gangguan layanan/jaringan. */
type AuthErr = { code?: string; status?: number; name?: string } | null | undefined;

export const MSG_UNVERIFIED = "Email belum dikonfirmasi. Buka kotak masuk kamu dan klik tautan konfirmasi.";
export const MSG_BAD_CREDENTIALS = "Email atau kata sandi salah.";
export const MSG_SERVICE = "Layanan autentikasi sedang bermasalah atau koneksi terputus. Coba lagi sebentar lagi.";
export const MSG_RATE = "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";

export function isServiceFailure(err: AuthErr): boolean {
  if (!err) return false;
  if (err.name === "AuthRetryableFetchError") return true;
  return typeof err.status === "number" && (err.status === 0 || err.status >= 500);
}

export function mapSignInError(err: AuthErr): { message: string; unverified: boolean } {
  if (err?.code === "email_not_confirmed") return { message: MSG_UNVERIFIED, unverified: true };
  if (err?.code === "over_request_rate_limit" || err?.status === 429) return { message: MSG_RATE, unverified: false };
  if (isServiceFailure(err)) return { message: MSG_SERVICE, unverified: false };
  return { message: MSG_BAD_CREDENTIALS, unverified: false };
}

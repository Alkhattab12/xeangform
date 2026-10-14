/** Klasifikasi hasil callback autentikasi (dipisah dari route agar bisa diuji tanpa Next.js). */
export type CallbackFlow = "signup" | "email_change" | "recovery" | null;
export type LinkProblem = "kedaluwarsa" | "kode" | "layanan" | "tautan";

const OTP_TYPES = ["signup", "email", "recovery", "email_change", "invite", "magiclink"] as const;
export type OtpType = (typeof OTP_TYPES)[number];
export function parseOtpType(v: string | null): OtpType | null {
  return (OTP_TYPES as readonly string[]).includes(v ?? "") ? (v as OtpType) : null;
}
export function parseFlow(v: string | null): CallbackFlow {
  return v === "signup" || v === "email_change" || v === "recovery" ? v : null;
}

/** Memetakan error Supabase menjadi kategori pesan yang dipahami pengguna. */
export function classifyLinkError(err: { code?: string; message?: string; status?: number; name?: string } | string | null | undefined): LinkProblem {
  if (err && typeof err === "object" && (err.name === "AuthRetryableFetchError" || (typeof err.status === "number" && (err.status === 0 || err.status >= 500)))) return "layanan";
  const code = typeof err === "string" ? err : err?.code ?? "";
  const msg = (typeof err === "string" ? err : err?.message ?? "").toLowerCase();
  if (code === "otp_expired" || code === "flow_state_expired" || msg.includes("expired")) return "kedaluwarsa";
  if (msg.includes("code verifier") || msg.includes("flow state") || code === "flow_state_not_found") return "kode";
  return "tautan";
}

/** Tujuan setelah verifikasi BERHASIL. */
export function successPath(flow: CallbackFlow, type: OtpType | null, next: string): string {
  if (flow === "recovery" || type === "recovery" || next === "/reset-password") return "/reset-password";
  if (flow === "email_change" || type === "email_change") return "/dashboard/akun?info=email";
  if (flow === "signup" || type === "signup" || type === "email") return `/auth/terverifikasi?next=${encodeURIComponent(next)}`;
  return next;
}

/** Tujuan saat verifikasi GAGAL (halaman yang menawarkan tindakan lanjutan yang tepat). */
export function failurePath(flow: CallbackFlow, problem: LinkProblem): string {
  if (flow === "recovery") return `/lupa-password?error=${problem}`;
  if (flow === "signup") return `/cek-email?error=${problem}`;
  return `/masuk?error=${problem}`;
}

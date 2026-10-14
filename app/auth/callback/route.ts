import { NextResponse, type NextRequest } from "next/server";
import { classifyLinkError, failurePath, parseFlow, parseOtpType, successPath } from "@/lib/auth/callback";
import { isEmailVerified } from "@/lib/auth/verified";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

/**
 * Callback tautan email Supabase (konfirmasi akun, ubah email, reset password).
 * Mendukung dua bentuk tautan:
 *  - ?code=...            (PKCE; butuh cookie code-verifier dari perangkat yang sama)
 *  - ?token_hash=&type=   (verifyOtp; berfungsi lintas perangkat, butuh template email kustom)
 * Setiap kegagalan diarahkan ke halaman yang menawarkan tindakan lanjutan yang tepat.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const flow = parseFlow(searchParams.get("flow"));
  const next = safeNext(searchParams.get("next"));
  const to = (path: string) => NextResponse.redirect(`${origin}${path}`);

  // Supabase menaruh error di query bila verifikasi di sisi mereka sudah gagal (mis. otp_expired)
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) return to(failurePath(flow, classifyLinkError(providerError)));

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  if (!code && !(tokenHash && type)) return to(failurePath(flow, "tautan"));

  const supabase = await createClient();
  const { data, error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code as string);

  if (error) return to(failurePath(flow, classifyLinkError(error)));

  // Jangan tampilkan "berhasil" kecuali backend benar-benar menyatakan email terverifikasi
  // (pengecualian: reset password dan ubah email yang menunggu konfirmasi kedua, yang memang bukan verifikasi akun baru)
  const isSignup = flow === "signup" || type === "signup" || type === "email";
  if (isSignup && !isEmailVerified(data.user)) return to(failurePath(flow, "tautan"));

  return to(successPath(flow, type, next));
}

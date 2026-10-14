import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

/** Menukar ?code= dari email (konfirmasi akun / reset password) menjadi sesi. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Jika Supabase redirect langsung dengan pesan error (misal token expired)
  if (error || errorCode) {
    const isExpired = errorCode === "otp_expired" || error === "access_denied" || errorDescription?.toLowerCase().includes("expired");
    const param = isExpired ? "tautan_kedaluwarsa" : "tautan_tidak_valid";
    return NextResponse.redirect(`${origin}/masuk?error=${param}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      // Verifikasi status user setelah penukaran kode
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
      if (user && isConfirmed) {
        // Jika alur reset password, langsung bawa ke rute reset-password
        if (next === "/reset-password") {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
        // Redirect aman ke tujuan atau dashboard dengan penanda verified
        const target = next.startsWith("/dashboard")
          ? next.includes("?")
            ? `${next}&verified=1`
            : `${next}?verified=1`
          : next;
        return NextResponse.redirect(`${origin}${target}`);
      }
    }

    const isExpired = exchangeError?.message?.toLowerCase().includes("expired");
    return NextResponse.redirect(`${origin}/masuk?error=${isExpired ? "tautan_kedaluwarsa" : "tautan_tidak_valid"}`);
  }

  return NextResponse.redirect(`${origin}/masuk?error=tautan_tidak_valid`);
}


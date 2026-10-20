import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailVerified } from "@/lib/auth/verified";
import { supabaseEnv } from "./env";

/** Menyegarkan sesi pengguna yang login + proteksi rute /dashboard. Pengunjung tanpa cookie sesi dilewati. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env: { url: string; key: string };
  try {
    env = supabaseEnv();
  } catch {
    return response; // env belum diisi: biarkan halaman publik tetap jalan
  }

  const path = request.nextUrl.pathname;

  // Pengunjung anonim (mayoritas peserta form publik) tidak punya cookie sesi Supabase: tidak ada yang perlu
  // disegarkan, jadi getUser() (panggilan jaringan ke Supabase Auth) dilewati. Yang membawa cookie sesi tetap
  // diproses penuh di bawah, agar token peserta yang login tetap ter-refresh (blokir tertaut akun, 1 respons per akun).
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasAuthCookie) {
    if (path.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.search = "";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() memverifikasi token ke server Supabase (jangan pakai getSession untuk keputusan akses)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const verified = isEmailVerified(user);

  if (!user && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Ada sesi tetapi email belum terverifikasi: tidak boleh menyentuh area privat (termasuk server action & ekspor)
  if (user && !verified && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/cek-email";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && verified && (path === "/masuk" || path === "/daftar")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

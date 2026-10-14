import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/** Menyegarkan sesi di setiap request + proteksi rute /dashboard. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env: { url: string; key: string };
  try {
    env = supabaseEnv();
  } catch {
    return response; // env belum diisi: biarkan halaman publik tetap jalan
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

  const isEmailConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const path = request.nextUrl.pathname;

  if (user && !isEmailConfirmed && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    url.searchParams.set("error", "email_belum_dikonfirmasi");
    if (user.email) url.searchParams.set("email", user.email);
    return NextResponse.redirect(url);
  }

  if (!user && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isEmailConfirmed && (path === "/masuk" || path === "/daftar")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Matcher luas agar sesi peserta yang login di rute formulir publik (/f/...) tetap di-refresh secara berkala.
// Pengunjung anonim berbiaya murah karena panggilan getUser() dilewati di dalam updateSession jika tidak ada cookie sesi.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

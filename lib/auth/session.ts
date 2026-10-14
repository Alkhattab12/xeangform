import { cache } from "react";
import { isEmailVerified } from "@/lib/auth/verified";
import { createClient } from "@/lib/supabase/server";

/** Satu kali query per request, dipakai bersama oleh layout dan page. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Akun yang emailnya belum terverifikasi dianggap TIDAK login untuk seluruh area privat
  if (!user || !isEmailVerified(user)) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Pengguna";
  return { user, displayName };
});

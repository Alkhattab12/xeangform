import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Satu kali query per request, dipakai bersama oleh layout dan page. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Akun belum terverifikasi tidak boleh dianggap memiliki sesi aktif untuk fitur privat
  const isConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!isConfirmed) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, background_mode")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Pengguna";
  const backgroundMode = (profile?.background_mode as "motion" | "static") || "motion";
  return { user, displayName, backgroundMode };
});

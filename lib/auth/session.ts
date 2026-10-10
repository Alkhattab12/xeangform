import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Satu kali query per request, dipakai bersama oleh layout dan page. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Pengguna";
  return { user, displayName };
});

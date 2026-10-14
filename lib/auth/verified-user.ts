import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isEmailVerified } from "./verified";

/**
 * Pengguna yang sedang login DAN emailnya terverifikasi (status dari Supabase Auth), atau null.
 * Dipakai di setiap server action / route privat. Proxy saja tidak cukup: server action bisa dikirim ke path mana pun,
 * jadi pemeriksaan harus dilakukan juga di sini.
 */
export async function getVerifiedUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isEmailVerified(user) ? user : null;
}

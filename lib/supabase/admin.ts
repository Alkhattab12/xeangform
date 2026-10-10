import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabaseEnv } from "./env";

/**
 * Klien service-role: MELEWATI RLS. Hanya untuk kode server (form publik, submit respons).
 * Jangan pernah mengimpor file ini dari komponen client.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key = serviceRoleKey();
  if (!key) throw new Error("Service role key belum diisi di environment variable server.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Klien Supabase untuk Browser / Client Components.
 * Mengembalikan singleton client browser, atau null jika dipanggil di server atau env belum disetel.
 */
export function getBrowserClient() {
  if (typeof window === "undefined") return null;
  if (cachedClient) return cachedClient;

  try {
    const { url, key } = supabaseEnv();
    cachedClient = createBrowserClient(url, key);
    return cachedClient;
  } catch {
    return null;
  }
}

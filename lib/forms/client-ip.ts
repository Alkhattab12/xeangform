import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serviceRoleKey } from "@/lib/supabase/env";

/** Hash IP klien (HMAC) dengan rumus yang sama seperti rate limit respons. Tidak menyimpan IP mentah. */
export async function getClientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", serviceRoleKey() ?? "dev").update(ip).digest("hex").slice(0, 32);
}

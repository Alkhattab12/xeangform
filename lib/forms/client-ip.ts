import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serviceRoleKey } from "@/lib/supabase/env";

/**
 * IP klien dari header yang diisi platform, bukan dari header kustom klien.
 * Urutan: x-vercel-forwarded-for (diisi Vercel, tidak bisa dipalsukan klien) lalu x-real-ip,
 * dan terakhir entri pertama x-forwarded-for untuk lingkungan non-Vercel (dev lokal).
 */
export function pickClientIp(h: Pick<Headers, "get">): string {
  const vercel = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Hash IP klien (HMAC) dengan rumus yang sama seperti rate limit respons. Tidak menyimpan IP mentah. */
export async function getClientIpHash(): Promise<string> {
  const ip = pickClientIp(await headers());
  return createHmac("sha256", serviceRoleKey() ?? "dev").update(ip).digest("hex").slice(0, 32);
}

import "server-only";
import { headers } from "next/headers";
import { pickSiteOrigin } from "./origin";

/** Origin situs yang aman dipakai untuk emailRedirectTo (lihat pickSiteOrigin). */
export async function getSiteOrigin() {
  const h = await headers();
  return pickSiteOrigin({
    origin: h.get("origin"),
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    envUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

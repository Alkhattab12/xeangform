import { createHash } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidSchemaLoose = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // namespace UUID standar (DNS)

/** UUID v5 deterministik: nama yang sama selalu menghasilkan id yang sama (dipakai agar seed tidak pernah dobel). */
export function uuidV5(name: string): string {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
  const h = createHash("sha1").update(ns).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

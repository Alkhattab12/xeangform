// Pembatas laju sederhana di memori (per instance server).
// Catatan: di serverless (Vercel) tiap instance punya hitungan sendiri, jadi ini penghambat dasar, bukan jaminan keras.
// Untuk batas yang ketat lintas instance, pakai Vercel WAF/Firewall rate limit atau Upstash.
const hits = new Map<string, number[]>();

/** true = permintaan ini MELEBIHI batas (harus ditolak). */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return false;
}

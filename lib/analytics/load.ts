import type { createClient } from "@/lib/supabase/server";
import { readMeta } from "@/lib/forms/answers";
import type { RawSubmission, Range } from "./compute";

type Db = Awaited<ReturnType<typeof createClient>>;
export const ANALYTICS_CAP = 5000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
type Row = { id: string; submitted_at: string; status: string; answers_json: unknown; metadata_json: unknown; respondent_id?: string | null };

/**
 * Memuat respons milik user (RLS membatasi ke form miliknya) hanya dengan kolom yang dibutuhkan.
 * Rentang tanggal difilter di database (WIB). Mengambil hingga `cap` respons TERBARU; `capped`
 * memberi tahu jika data lebih banyak dari batas. Hanya angka agregat yang dikirim ke browser.
 * Jika kolom respondent_id belum ada di database (migrasi 0004 belum dijalankan), query diulang tanpa kolom itu.
 */
export async function loadSubmissions(db: Db, formId: string, range: Range, cap = ANALYTICS_CAP) {
  const run = async (cols: string) => {
    let q = db.from("form_submissions").select(cols, { count: "exact" }).eq("form_id", formId);
    if (range.from) q = q.gte("submitted_at", `${range.from}T00:00:00+07:00`);
    if (range.to) q = q.lte("submitted_at", `${range.to}T23:59:59.999+07:00`);
    return q.order("submitted_at", { ascending: false }).limit(cap);
  };
  let res = await run("id,submitted_at,status,answers_json,metadata_json,respondent_id");
  let hasRespondentColumn = true;
  if (res.error && /respondent_id/i.test(res.error.message ?? "")) {
    hasRespondentColumn = false;
    res = await run("id,submitted_at,status,answers_json,metadata_json");
  }
  const raw = (res.data ?? []) as unknown as Row[];
  const rows: RawSubmission[] = raw.map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    status: r.status,
    answers: isObj(r.answers_json) ? r.answers_json : {},
    respondentId: r.respondent_id ?? null,
    meta: readMeta(r.metadata_json),
  }));
  const total = res.count ?? rows.length;
  return { rows, total, capped: total > cap, error: !!res.error, hasRespondentColumn };
}

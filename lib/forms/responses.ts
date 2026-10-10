import type { createClient } from "@/lib/supabase/server";
import { formatAnswer, readMeta, type ResponseRow } from "./answers";
import { isInputType, type FormField } from "./schema";

type Db = Awaited<ReturnType<typeof createClient>>;
export type Filters = { q: string; from: string; to: string; sort: "baru" | "lama" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const from = one(sp.from);
  const to = one(sp.to);
  return {
    q: one(sp.q).trim().slice(0, 100),
    from: DATE.test(from) ? from : "",
    to: DATE.test(to) ? to : "",
    sort: one(sp.sort) === "lama" ? "lama" : "baru",
  };
}

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.sort !== "baru") p.set("sort", f.sort);
  return p.toString();
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function searchText(fields: FormField[], r: ResponseRow): string {
  const parts = [r.id, r.meta.respondent?.email ?? "", r.meta.respondent?.name ?? ""];
  for (const f of fields) if (isInputType(f.type)) parts.push(formatAnswer(f, r.answers[f.id], "csv"));
  return parts.join(" \n ").toLowerCase();
}

/**
 * Memuat respons milik user (RLS) dengan filter tanggal di database (zona WIB).
 * Pencarian teks dilakukan setelah pemuatan, atas hingga `cap` respons terbaru/terlama.
 */
export async function loadResponses(db: Db, formId: string, fields: FormField[], f: Filters, cap: number) {
  let q = db.from("form_submissions").select("id,submitted_at,answers_json,metadata_json", { count: "exact" }).eq("form_id", formId);
  if (f.from) q = q.gte("submitted_at", `${f.from}T00:00:00+07:00`);
  if (f.to) q = q.lte("submitted_at", `${f.to}T23:59:59.999+07:00`);
  const { data, error, count } = await q.order("submitted_at", { ascending: f.sort === "lama" }).limit(cap);

  const raw = (data ?? []) as unknown as { id: string; submitted_at: string; answers_json: unknown; metadata_json: unknown }[];
  let rows: ResponseRow[] = raw.map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    answers: isObj(r.answers_json) ? r.answers_json : {},
    meta: readMeta(r.metadata_json),
  }));
  if (f.q) {
    const needle = f.q.toLowerCase();
    rows = rows.filter((r) => searchText(fields, r).includes(needle));
  }
  return { rows, total: count ?? rows.length, capped: (count ?? 0) > cap, error: !!error };
}

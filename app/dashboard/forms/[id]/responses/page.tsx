import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteResponsesAction } from "@/app/actions/responses";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { SelectAll } from "@/components/responses/SelectAll";
import { formatAnswer } from "@/lib/forms/answers";
import { filtersToQuery, loadResponses, parseFilters } from "@/lib/forms/responses";
import { formSchemaJson, isInputType } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Respons" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const LOAD_CAP = 1000;
const EXPORT_CAP = 5000;
const small = "nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm";

export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: form } = await supabase.from("forms").select("title,status,schema_json").eq("id", id).maybeSingle();
  if (!form) notFound();

  const parsed = formSchemaJson.safeParse(form.schema_json);
  const fields = parsed.success ? parsed.data.fields : [];
  const filters = parseFilters(sp);
  const res = await loadResponses(supabase, id, fields, filters, LOAD_CAP);

  const base = `/dashboard/forms/${id}/responses`;
  const qs = filtersToQuery(filters);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const totalPages = Math.max(1, Math.ceil(res.rows.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, parseInt(pageRaw ?? "1", 10) || 1));
  const rows = res.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = !!(filters.q || filters.from || filters.to);
  const notice = typeof sp.notice === "string" ? sp.notice.slice(0, 200) : "";
  const errorMsg = typeof sp.error === "string" ? sp.error.slice(0, 200) : "";

  const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Jakarta" });
  const inputs = fields.filter((f) => isInputType(f.type) && f.type !== "file");
  const pageHref = (p: number) => {
    const u = new URLSearchParams(qs);
    u.set("page", String(p));
    return `${base}?${u.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-5 py-8 sm:py-10 w-full min-w-0 max-w-full">
      <nav aria-label="Navigasi halaman" className="nb-mono flex flex-wrap gap-4">
        <Link href="/dashboard" className="underline underline-offset-4">← Dashboard</Link>
        <Link href={`/dashboard/forms/${id}`} className="underline underline-offset-4">Editor form</Link>
        <Link href={`/dashboard/forms/${id}/analytics`} className="underline underline-offset-4">Analitik</Link>
      </nav>
      <p className="nb-mono mt-6">Respons / {form.status === "published" ? "Terbit" : form.status === "archived" ? "Arsip" : "Draft"}</p>
      <h1 className="mt-2 break-words font-display text-[clamp(2rem,6vw,3.5rem)] font-bold">{form.title as string}</h1>

      {notice && <div role="status" className="nb-panel mt-6 border-[3px] bg-accent p-3 font-bold text-ink">{notice}</div>}
      {errorMsg && <div role="alert" className="nb-panel mt-6 border-[3px] bg-orange p-3 font-bold text-ink">{errorMsg}</div>}

      <form method="get" className="nb-panel nb-panel-strong mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 w-full min-w-0 max-w-full">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="mb-1 block font-display text-sm font-bold">Cari jawaban</label>
          <input id="q" name="q" type="search" defaultValue={filters.q} className="nb-input" maxLength={100} />
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block font-display text-sm font-bold">Dari tanggal</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="nb-input" />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block font-display text-sm font-bold">Sampai tanggal</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="nb-input" />
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block font-display text-sm font-bold">Urutan</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="nb-input">
            <option value="baru">Terbaru dulu</option>
            <option value="lama">Terlama dulu</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="nb-btn">Terapkan</button>
          <Link href={base} className="nb-btn nb-btn-ghost">Reset</Link>
          <span className="nb-mono">Tanggal memakai zona WIB</span>
        </div>
      </form>

      {res.error ? (
        <div role="alert" className="nb-panel mt-6 border-[3px] bg-orange p-4 font-bold text-ink">
          Gagal memuat respons. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-2xl font-bold" aria-live="polite">
              {res.rows.length} respons{filtered ? " cocok" : ""}
            </p>
            <a href={`${base}/export${qs ? `?${qs}` : ""}`} className="nb-btn min-h-10 px-3 py-2 text-sm">Ekspor CSV</a>
          </div>
          {res.capped && (
            <p className="nb-mono mt-2">
              Menampilkan {LOAD_CAP} respons {filters.sort === "lama" ? "terlama" : "terbaru"} dari {res.total}. Persempit dengan filter tanggal. Ekspor CSV mencakup maksimal {EXPORT_CAP}.
            </p>
          )}

          {res.rows.length === 0 ? (
            <section className="nb-panel nb-panel-strong mt-6 p-8">
              <p className="nb-mono mb-2">{filtered ? "Tidak ada yang cocok" : "Belum ada respons"}</p>
              <h2 className="font-display text-3xl font-bold">
                {filtered ? "Coba ubah atau reset filter." : "Bagikan tautan form untuk mulai menerima jawaban."}
              </h2>
            </section>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <SelectAll />
                <form id="bulk" action={deleteResponsesAction}>
                  <input type="hidden" name="formId" value={id} />
                  <input type="hidden" name="qs" value={qs} />
                  <ConfirmButton message="Hapus respons yang dipilih? Tindakan ini tidak bisa dibatalkan." className={small}>
                    Hapus terpilih
                  </ConfirmButton>
                </form>
              </div>

              <ul className="mt-4 space-y-3 w-full min-w-0 max-w-full">
                {rows.map((r) => {
                  const preview = inputs
                    .map((f) => ({ f, text: formatAnswer(f, r.answers[f.id]) }))
                    .filter((x) => x.text)
                    .slice(0, 3);
                  const when = fmt.format(new Date(r.submitted_at));
                  return (
                    <li key={r.id} className="nb-panel nb-panel-strong nb-shadow flex items-start gap-3 p-4 min-w-0 max-w-full">
                      <input type="checkbox" form="bulk" name="ids" value={r.id} aria-label={`Pilih respons ${when}`} className="mt-1 h-5 w-5 shrink-0 accent-[#3457ff]" />
                      <Link href={`${base}/${r.id}${qs ? `?${qs}` : ""}`} className="min-w-0 flex-1">
                        <span className="nb-mono block break-words">
                          {when}
                          {r.meta.score ? ` · Benar ${r.meta.score.correct}/${r.meta.score.total}` : ""}
                          {r.meta.violations ? ` · Pindah tab ${r.meta.violations}×` : ""}
                        </span>
                        {r.meta.respondent?.email && <span className="nb-mono block break-words">{r.meta.respondent.email}</span>}
                        {preview.length === 0 ? (
                          <span className="mt-1 block opacity-70">(tidak ada jawaban yang terisi)</span>
                        ) : (
                          preview.map(({ f, text }) => (
                            <span key={f.id} className="mt-3 block">
                              <span className="nb-mono block truncate opacity-70">{f.label || "(tanpa judul)"}</span>
                              <span className="mt-1 inline-block max-w-full truncate border-2 border-line bg-accent/40 px-2 py-0.5 align-top font-semibold">{text}</span>
                            </span>
                          ))
                        )}
                        <span className="nb-mono mt-2 block underline underline-offset-4">Buka detail →</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 && (
                <nav aria-label="Halaman" className="mt-6 flex items-center justify-between gap-3">
                  {page > 1 ? <Link href={pageHref(page - 1)} className={small}>← Sebelumnya</Link> : <span />}
                  <span className="nb-mono">Halaman {page} / {totalPages}</span>
                  {page < totalPages ? <Link href={pageHref(page + 1)} className={small}>Berikutnya →</Link> : <span />}
                </nav>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

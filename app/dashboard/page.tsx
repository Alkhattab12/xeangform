import Link from "next/link";
import type { Metadata } from "next";
import { createForm, deleteFormAction, duplicateFormAction, setStatusAction } from "@/app/actions/forms";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Starburst } from "@/components/brand/Shapes";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PendingButton } from "@/components/ui/PendingButton";
import { getSessionUser } from "@/lib/auth/session";
import type { FormStatus } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type FormRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  form_submissions: { count: number }[] | null;
};

const FILTERS = [
  { key: "semua", label: "Semua", status: null },
  { key: "terbit", label: "Terbit", status: "published" },
  { key: "draft", label: "Draft", status: "draft" },
  { key: "arsip", label: "Arsip", status: "archived" },
] as const;

const STATUS_LABEL: Record<FormStatus, string> = { draft: "Draft", published: "Terbit", archived: "Arsip" };
const STATUS_TONE: Record<FormStatus, string> = { draft: "bg-surface", published: "bg-accent text-ink", archived: "bg-lavender text-ink" };
const small = "nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];
  const session = await getSessionUser();
  const supabase = await createClient();

  // Semua angka dihitung dari data nyata; RLS memastikan hanya milik user ini.
  const base = supabase
    .from("forms")
    .select("id,title,description,slug,status,created_at,updated_at,form_submissions(count)")
    .order("updated_at", { ascending: false });

  const [list, forms, published, responses, files] = await Promise.all([
    filter.status ? base.eq("status", filter.status) : base.neq("status", "archived"),
    supabase.from("forms").select("id", { count: "exact" }).limit(1),
    supabase.from("forms").select("id", { count: "exact" }).eq("status", "published").limit(1),
    supabase.from("form_submissions").select("id", { count: "exact" }).limit(1),
    supabase.from("submission_files").select("id", { count: "exact" }).limit(1),
  ]);
  const val = (r: { count: number | null; error: unknown }) => (r.error ? null : (r.count ?? 0));
  const rows = (list.data ?? []) as unknown as FormRow[];

  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date());
  const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
  const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
  const errorMsg = sp.error ? sp.error.slice(0, 300) : null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <p className="nb-mono">{today}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[clamp(2.25rem,7vw,4.5rem)] font-bold">
          {greeting()}, {session?.displayName}.
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/import" className="nb-btn nb-btn-ghost">Impor Form</Link>
          <form action={createForm}>
            <SubmitButton pendingLabel="Membuat…">Buat Form Baru</SubmitButton>
          </form>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="nb-panel mt-6 border-[3px] bg-orange p-4 font-bold text-ink">{errorMsg}</div>
      )}

      <section aria-label="Ringkasan" className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total form" value={val(forms)} tone="bg-accent text-ink" />
        <MetricCard label="Total respons" value={val(responses)} />
        <MetricCard label="Form terbit" value={val(published)} />
        <MetricCard label="Lampiran file" value={val(files)} />
      </section>

      <nav aria-label="Filter form" className="mt-12 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter.key;
          return (
            <Link
              key={f.key}
              href={f.key === "semua" ? "/dashboard" : `/dashboard?status=${f.key}`}
              aria-current={active ? "page" : undefined}
              className={`nb-btn min-h-10 px-3 py-2 text-sm ${active ? "" : "nb-btn-ghost"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {list.error ? (
        <div role="alert" className="nb-panel mt-6 border-[3px] bg-orange p-4 font-bold text-ink">
          Gagal memuat daftar form. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : rows.length === 0 ? (
        <section className="nb-panel nb-panel-strong nb-shadow relative mt-6 overflow-hidden p-8 sm:p-12">
          <Starburst className="absolute -right-8 -top-8 h-40 w-40 rotate-12 fill-lavender stroke-line" />
          <p className="nb-mono mb-3">{filter.key === "semua" ? "Belum ada form" : `Tidak ada form ${filter.label.toLowerCase()}`}</p>
          <h2 className="max-w-xl font-display text-4xl font-bold">
            {filter.key === "semua" ? "Kanvas kosong. Siap diisi ide pertamamu." : "Tidak ada yang cocok dengan filter ini."}
          </h2>
          {filter.key === "semua" && (
            <form action={createForm} className="mt-6 max-w-xs">
              <SubmitButton pendingLabel="Membuat…">Buat Form Pertama</SubmitButton>
            </form>
          )}
        </section>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((f) => (
            <li key={f.id} className="nb-panel nb-panel-strong flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words font-display text-2xl font-bold">
                  <Link href={`/dashboard/forms/${f.id}`} className="underline-offset-4 hover:underline">{f.title}</Link>
                </h2>
                <span className={`nb-mono shrink-0 border-2 border-line px-2 py-1 ${STATUS_TONE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
              </div>
              {f.description && <p className="line-clamp-2">{f.description}</p>}
              <dl className="nb-mono grid grid-cols-2 gap-x-4 gap-y-2">
                <div><dt className="opacity-70">Dibuat</dt><dd>{dateFmt.format(new Date(f.created_at))}</dd></div>
                <div><dt className="opacity-70">Diperbarui</dt><dd>{dateTimeFmt.format(new Date(f.updated_at))}</dd></div>
                <div><dt className="opacity-70">Respons</dt><dd>{f.form_submissions?.[0]?.count ?? 0}</dd></div>
                <div><dt className="opacity-70">Tautan publik</dt><dd className="break-all">{f.status === "published" ? `/f/${f.slug}` : "Belum aktif"}</dd></div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/dashboard/forms/${f.id}`} className="nb-btn min-h-10 px-3 py-2 text-sm">Buka</Link>
                <Link href={`/dashboard/forms/${f.id}/responses`} className={small}>Respons ({f.form_submissions?.[0]?.count ?? 0})</Link>
                <a href={`/dashboard/forms/${f.id}/export`} className={small}>Ekspor</a>
                <form action={duplicateFormAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <PendingButton className={small}>Duplikat</PendingButton>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="status" value={f.status === "published" ? "draft" : "published"} />
                  <PendingButton className={small}>{f.status === "published" ? "Tarik kembali" : "Terbitkan"}</PendingButton>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="status" value={f.status === "archived" ? "draft" : "archived"} />
                  <PendingButton className={small}>{f.status === "archived" ? "Pulihkan" : "Arsipkan"}</PendingButton>
                </form>
                <form action={deleteFormAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <ConfirmButton message={`Hapus "${f.title}" beserta semua respons dan filenya? Tindakan ini tidak bisa dibatalkan.`} className={small}>
                    Hapus
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

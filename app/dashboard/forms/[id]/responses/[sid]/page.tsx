import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteResponsesAction } from "@/app/actions/responses";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { formatAnswer, readMeta } from "@/lib/forms/answers";
import { formSchemaJson, isInputType } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detail respons" };
export const dynamic = "force-dynamic";

export default async function ResponseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, sid } = await params;
  const uuid = z.string().uuid();
  if (!uuid.safeParse(id).success || !uuid.safeParse(sid).success) notFound();
  const sp = await searchParams;

  const supabase = await createClient();
  const [formRes, subRes] = await Promise.all([
    supabase.from("forms").select("title,schema_json").eq("id", id).maybeSingle(),
    supabase.from("form_submissions").select("id,submitted_at,answers_json,metadata_json").eq("id", sid).eq("form_id", id).maybeSingle(),
  ]);
  if (!formRes.data || !subRes.data) notFound();

  const parsed = formSchemaJson.safeParse(formRes.data.schema_json);
  const fields = parsed.success ? parsed.data.fields : [];
  const answers = (typeof subRes.data.answers_json === "object" && subRes.data.answers_json !== null ? subRes.data.answers_json : {}) as Record<string, unknown>;

  const meta = readMeta(subRes.data.metadata_json);
  const backQs = new URLSearchParams();
  for (const k of ["q", "from", "to", "sort", "page"]) {
    const v = Array.isArray(sp[k]) ? sp[k]![0] : sp[k];
    if (typeof v === "string" && v) backQs.set(k, v);
  }
  const back = `/dashboard/forms/${id}/responses${backQs.size ? `?${backQs.toString()}` : ""}`;
  const when = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(subRes.data.submitted_at as string));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href={back} className="nb-mono underline underline-offset-4">← Semua respons</Link>
      <p className="nb-mono mt-6">{formRes.data.title as string}</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold">Detail respons</h1>
      <p className="nb-mono mt-3">{when} WIB</p>
      <p className="nb-mono mt-1 break-all">ID: {sid}</p>

      {(meta.score || meta.respondent || meta.violations !== undefined) && (
        <div className="nb-panel nb-panel-strong mt-6 p-4">
          {meta.score && <p className="font-display text-2xl font-bold">Benar {meta.score.correct} dari {meta.score.total} soal</p>}
          {meta.respondent && (
            <p className="mt-2">Akun: {meta.respondent.name ? `${meta.respondent.name} · ` : ""}{meta.respondent.email ?? "-"}</p>
          )}
          {meta.violations !== undefined && <p className="mt-2">Berpindah tab/jendela: {meta.violations} kali</p>}
        </div>
      )}

      <dl className="mt-8 space-y-4">
        {fields.map((f) => {
          if (f.type === "section") {
            return <h2 key={f.id} className="pt-4 font-display text-2xl font-bold">{f.label}</h2>;
          }
          if (!isInputType(f.type) || f.type === "file") return null;
          const text = formatAnswer(f, answers[f.id]);
          return (
            <div key={f.id} className="nb-panel p-4">
              <dt className="font-display font-bold">{f.label || "(tanpa judul)"}</dt>
              <dd className="mt-2 whitespace-pre-wrap break-words">{text || <span className="opacity-60">— tidak diisi —</span>}</dd>
            </div>
          );
        })}
      </dl>

      <form action={deleteResponsesAction} className="mt-10">
        <input type="hidden" name="formId" value={id} />
        <input type="hidden" name="ids" value={sid} />
        <input type="hidden" name="qs" value={backQs.toString()} />
        <ConfirmButton message="Hapus respons ini? Tindakan ini tidak bisa dibatalkan." className="nb-btn nb-btn-ghost">
          Hapus respons ini
        </ConfirmButton>
      </form>
    </main>
  );
}

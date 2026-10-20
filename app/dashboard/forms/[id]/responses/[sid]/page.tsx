import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteResponsesAction } from "@/app/actions/responses";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { answerChips, formatAnswer, readMeta } from "@/lib/forms/answers";
import { formSchemaJson, isInputType } from "@/lib/forms/schema";
import { FileDownloadButton } from "@/components/responses/FileDownloadButton";
import type { UploadedFile } from "@/lib/forms/files";
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
    <main className="mx-auto max-w-3xl px-4 sm:px-5 py-8 sm:py-10 w-full min-w-0 max-w-full">
      <Link href={back} className="nb-mono underline underline-offset-4">← Semua respons</Link>
      <p className="nb-mono mt-6">{formRes.data.title as string}</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold">Detail respons</h1>
      <p className="nb-mono mt-3">{when} WIB</p>
      <p className="nb-mono mt-1 break-all">ID: {sid}</p>

      {meta.disqualified && (
        <div role="alert" className="nb-panel border-[3px] border-line bg-red-600 text-white p-4 font-bold mt-4 shadow-[3px_3px_0px_#000]">
          ⚠ Sesi didiskualifikasi: Respons ini dikirim otomatis setelah peserta mencapai batas {meta.violations ?? 3} pelanggaran keamanan. Jawaban ini adalah jawaban parsial sebelum sesi diblokir.
        </div>
      )}
      {meta.timeExpired && (
        <div role="status" className="nb-panel border-[3px] border-line bg-amber-400 text-ink p-4 font-bold mt-4 shadow-[3px_3px_0px_#000]">
          ⏰ Batas waktu habis: Respons ini dikirim otomatis saat waktu ujian berakhir. Jawaban ini adalah jawaban yang sempat diisi oleh peserta.
        </div>
      )}

      {(meta.score || meta.respondent || meta.violations !== undefined || meta.disqualified || meta.timeExpired) && (
        <div className="nb-panel nb-panel-strong nb-shadow mt-6 bg-accent p-4 text-[color:var(--on-accent)]">
          {meta.score && <p className="font-display text-2xl font-bold">Benar {meta.score.correct} dari {meta.score.total} soal</p>}
          {meta.respondent && (
            <p className="mt-2">Akun: {meta.respondent.name ? `${meta.respondent.name} · ` : ""}{meta.respondent.email ?? "-"}</p>
          )}
          {meta.violations !== undefined && <p className="mt-2">Pelanggaran dicatat: {meta.violations} kali</p>}
        </div>
      )}

      <ol className="mt-8 space-y-6">
        {(() => {
          let qn = 0;
          return fields.map((f) => {
            if (f.type === "section") {
              return (
                <li key={f.id} className="pt-2">
                  <h2 className="inline-block border-[3px] border-line bg-fg px-3 py-1 font-display text-xl font-bold text-bg">{f.label}</h2>
                </li>
              );
            }
            if (f.type === "page_break") {
              return (
                <li key={f.id} className="nb-mono border-y-[3px] border-dashed border-line py-2 text-center">
                  Halaman berikutnya{f.label ? ` — ${f.label}` : ""}
                </li>
              );
            }
            if (!isInputType(f.type)) return null;
            qn += 1;
            const value = answers[f.id];

            if (f.type === "file") {
              const files = Array.isArray(value) ? (value as UploadedFile[]) : [];
              return (
                <li key={f.id} className="nb-panel nb-panel-strong nb-shadow overflow-hidden">
                  <div className="border-b-[3px] border-line bg-fg px-4 py-3 text-bg">
                    <p className="nb-mono opacity-80">Pertanyaan {qn}</p>
                    <p className="mt-1 break-words font-display text-lg font-bold">{f.label || "(tanpa judul)"}</p>
                  </div>
                  <div className="p-4">
                    <p className="nb-mono mb-2">Berkas Terunggah ({files.length})</p>
                    {files.length === 0 ? (
                      <div className="border-2 border-dashed border-line px-3 py-3 italic opacity-70">Tidak ada berkas yang diunggah</div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <FileDownloadButton
                            key={file.storagePath}
                            formId={id}
                            storagePath={file.storagePath}
                            filename={file.originalFilename}
                            sizeBytes={file.sizeBytes}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            }

            const chips = answerChips(f, value);
            const text = formatAnswer(f, value);
            const empty = chips ? chips.length === 0 : text === "";
            return (
              <li key={f.id} className="nb-panel nb-panel-strong nb-shadow overflow-hidden">
                <div className="border-b-[3px] border-line bg-fg px-4 py-3 text-bg">
                  <p className="nb-mono opacity-80">Pertanyaan {qn}</p>
                  <p className="mt-1 break-words font-display text-lg font-bold">{f.label || "(tanpa judul)"}</p>
                </div>
                <div className="p-4">
                  <p className="nb-mono mb-2">Jawaban</p>
                  {empty ? (
                    <div className="border-2 border-dashed border-line px-3 py-3 italic opacity-70">Tidak diisi</div>
                  ) : chips ? (
                    <div className="flex flex-wrap gap-2">
                      {chips.map((c, i) => (
                        <span key={i} className="border-[3px] border-line bg-accent px-3 py-1 font-bold text-[color:var(--on-accent)]">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words border-2 border-l-[8px] border-line border-l-cobalt bg-accent/30 px-4 py-3 text-lg font-semibold">{text}</div>
                  )}
                </div>
              </li>
            );
          });
        })()}
      </ol>

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

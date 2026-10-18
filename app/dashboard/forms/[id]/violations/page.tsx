import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseSettings } from "@/lib/forms/schema";
import { ViolationMonitor, type SessionItem, type ViolationLogItem } from "@/components/dashboard/ViolationMonitor";

export const metadata: Metadata = { title: "Monitor Pelanggaran Ujian" };
export const dynamic = "force-dynamic";

export default async function FormViolationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();

  // RLS: hanya form milik user yang terbaca
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("id,title,status,slug,settings_json")
    .eq("id", id)
    .maybeSingle();

  if (formErr || !form) notFound();

  const settings = parseSettings(form.settings_json);
  const antiCheatingEnabled = Boolean(settings.proctoring?.enabled);

  // Ambil seluruh sesi ujian untuk formulir ini
  const { data: rawSessions } = await supabase
    .from("proctoring_sessions")
    .select("id,form_id,session_key,respondent_id,respondent_name,respondent_email,status,violation_count,max_violations,started_at,ended_at,last_violation_at,metadata_json,created_at")
    .eq("form_id", id)
    .order("last_violation_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const sessionIds = (rawSessions || []).map((s) => s.id);

  // Ambil detail log untuk sesi yang ada
  let logsBySession: Record<string, ViolationLogItem[]> = {};
  if (sessionIds.length > 0) {
    const { data: rawLogs } = await supabase
      .from("proctoring_logs")
      .select("id,session_id,violation_type,violation_number,message,occurred_at,details_json")
      .in("session_id", sessionIds)
      .order("occurred_at", { ascending: true });

    if (rawLogs) {
      for (const log of rawLogs) {
        if (!logsBySession[log.session_id]) logsBySession[log.session_id] = [];
        logsBySession[log.session_id].push({
          id: log.id,
          sessionId: log.session_id,
          violationType: log.violation_type,
          violationNumber: log.violation_number,
          message: log.message,
          occurredAt: log.occurred_at,
          details: log.details_json && typeof log.details_json === "object" ? log.details_json : {},
        });
      }
    }
  }

  const mappedSessions: SessionItem[] = (rawSessions || []).map((s) => ({
    id: s.id,
    formId: s.form_id,
    sessionKey: s.session_key,
    respondentName: s.respondent_name,
    respondentEmail: s.respondent_email,
    status: s.status as "in_progress" | "completed" | "blocked",
    violationCount: s.violation_count,
    maxViolations: s.max_violations,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    lastViolationAt: s.last_violation_at,
    metadata: s.metadata_json && typeof s.metadata_json === "object" ? s.metadata_json : {},
    createdAt: s.created_at,
    logs: logsBySession[s.id] || [],
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-5 py-8 sm:py-10 w-full min-w-0">
      <nav aria-label="Navigasi halaman" className="nb-mono flex flex-wrap gap-4 text-sm">
        <Link href="/dashboard" className="underline underline-offset-4">← Dashboard</Link>
        <Link href={`/dashboard/forms/${id}`} className="underline underline-offset-4">Editor form</Link>
        <Link href={`/dashboard/forms/${id}/responses`} className="underline underline-offset-4">Respons</Link>
        <Link href={`/dashboard/forms/${id}/analytics`} className="underline underline-offset-4">Analitik</Link>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="nb-mono text-sm">Pengawasan Ujian & Anti-Cheating</p>
          <h1 className="mt-1 break-words font-display text-[clamp(1.8rem,5vw,3rem)] font-bold">
            {form.title as string}
          </h1>
        </div>
      </div>

      <div className="mt-8">
        <ViolationMonitor
          formId={id}
          formTitle={form.title as string}
          slug={form.slug as string}
          sessions={mappedSessions}
          antiCheatingEnabled={antiCheatingEnabled}
        />
      </div>
    </main>
  );
}

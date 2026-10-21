"use server";

import { z } from "zod";
import { gradeQuiz } from "@/lib/forms/grade";
import { formSchemaJson, parseSettings, resolveTimeLimit } from "@/lib/forms/schema";
import { TIME_LIMIT_GRACE_MS, deadlineMs } from "@/lib/forms/time-limit";
import type { UploadedFile } from "@/lib/forms/files";
import { validateAnswers } from "@/lib/forms/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIpHash } from "@/lib/forms/client-ip";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { createNotification } from "@/lib/notifications/create";
import { verifyUploadedFiles } from "@/lib/forms/upload-verify";

export type QuizResult = { correct: number; total: number };
export type SubmitResult =
  | { ok: true; result?: QuizResult }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Record<string, string>;
      needsLogin?: boolean;
      alreadySubmitted?: boolean;
      blocked?: boolean;
      /** Batas waktu (ditambah masa tenggang) sudah lewat: jawaban tidak diterima lagi. */
      timeExpired?: boolean;
    };

const slugSchema = z.string().regex(/^[a-z0-9-]{6,64}$/);
// Catatan: data pelanggaran TIDAK diterima dari klien. Untuk form ber-proctoring, hitungan dan
// kejadian pelanggaran diambil dari sesi + log di server (lihat langkah 7) sehingga tidak bisa dipalsukan.
const payloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  clientKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  website: z.string().max(200).optional(), // honeypot
  // Diisi klien saat peserta didiskualifikasi; hanya diterima server jika sesi memang terblokir
  disqualified: z.boolean().optional(),
  // Diisi klien saat hitung mundur habis (kirim otomatis). Hanya penanda; tenggat tetap diputuskan server.
  timeUp: z.boolean().optional(),
});

const GENERIC = "Respons belum tersimpan. Coba kirim lagi sebentar lagi.";
const ALREADY = "Formulir ini sudah selesai kamu kerjakan. Setiap akun hanya dapat mengisi satu kali.";
const NO_SESSION = "Sesi ujian tidak ditemukan. Muat ulang halaman, lalu mulai pengerjaan dari awal.";
const MAX_PER_MINUTE = 5;

const scoreOf = (meta: unknown): QuizResult | undefined => {
  const s = (meta as { score?: QuizResult } | null)?.score;
  return s && typeof s.correct === "number" && typeof s.total === "number" ? s : undefined;
};

export async function submitResponse(slug: string, input: unknown): Promise<SubmitResult> {
  if (!slugSchema.safeParse(slug).success) return { ok: false, error: "Form tidak tersedia." };
  const payload = payloadSchema.safeParse(input);
  if (!payload.success) return { ok: false, error: "Data yang dikirim tidak valid." };
  if (payload.data.website) return { ok: true }; // bot mengisi honeypot: pura-pura sukses, tidak disimpan

  try {
    const admin = createAdminClient();

    // 1) Form harus ada & terbit
    const { data: form, error: formErr } = await admin
      .from("forms")
      .select("id,owner_id,title,status,schema_json,settings_json")
      .eq("slug", slug)
      .maybeSingle();
    if (formErr) return { ok: false, error: GENERIC };
    if (!form || form.status !== "published") return { ok: false, error: "Form ini sudah tidak menerima respons." };
    const settings = parseSettings(form.settings_json);

    // 2) Idempotensi: kirim ulang dengan kunci sama = sukses tanpa menyimpan dua kali
    const { data: dup } = await admin
      .from("form_submissions")
      .select("id,metadata_json")
      .eq("form_id", form.id)
      .eq("metadata_json->>client_key", payload.data.clientKey)
      .limit(1);
    if (dup && dup.length > 0) return { ok: true, result: settings.quiz ? scoreOf(dup[0].metadata_json) : undefined };

    // 2b) Sesi di server (server-authoritative): wajib untuk form ber-proctoring dan/atau berbatas waktu
    const procOn = Boolean(settings.proctoring?.enabled);
    const timeLimit = resolveTimeLimit(settings);
    let disqualified = false;
    let timeUpAuto = false; // dikirim karena waktu habis (otomatis oleh klien atau pada masa tenggang)
    let procSessionId: string | null = null;
    let procViolationCount = 0;
    let timeMeta: Record<string, unknown> | null = null;
    if (procOn || timeLimit.enabled) {
      const { data: procSession, error: procErr } = await admin
        .from("proctoring_sessions")
        .select("id,status,violation_count,max_violations,started_at")
        .eq("form_id", form.id)
        .eq("session_key", payload.data.clientKey)
        .maybeSingle();
      if (procErr) return { ok: false, error: GENERIC };
      if (!procSession) return { ok: false, error: NO_SESSION };

      const sessionBlocked =
        procOn && (procSession.status === "blocked" || procSession.violation_count >= procSession.max_violations);

      // Blokir tertaut ke akun: sesi baru dari tab/browser lain tidak menghapus blokir peserta yang login
      let accountBlocked = false;
      if (procOn && !sessionBlocked) {
        try {
          const sbp = await createClient();
          const pu = await getVerifiedUser(sbp);
          if (pu) {
            const { count: blockedCount } = await admin
              .from("proctoring_sessions")
              .select("id", { count: "exact", head: true })
              .eq("form_id", form.id)
              .eq("respondent_id", pu.id)
              .eq("status", "blocked");
            accountBlocked = (blockedCount ?? 0) > 0;
          }
        } catch {
          // peserta anonim: tidak ada akun untuk dicek
        }
      }

      if (sessionBlocked || accountBlocked) {
        // Kirim otomatis jawaban parsial hanya jika diaktifkan pemilik form dan sesi ini memang terblokir
        const canAutoSubmit =
          sessionBlocked && settings.proctoring.autoSubmitOnDisqualify && payload.data.disqualified === true;
        if (!canAutoSubmit) {
          return {
            ok: false,
            blocked: true,
            error: "Sesi ujian Anda telah dihentikan dan diblokir karena mencapai batas maksimal pelanggaran.",
          };
        }
        disqualified = true;
      } else if (procSession.status !== "in_progress") {
        return { ok: false, error: "Sesi ujian ini sudah berakhir. Muat ulang halaman untuk memulai sesi baru." };
      }

      // Batas waktu: tenggat dihitung dari started_at di server, tidak pernah dari jam peserta.
      // Berlaku untuk semua jalur kirim (termasuk jawaban parsial peserta yang didiskualifikasi).
      if (timeLimit.enabled) {
        const deadline = deadlineMs(procSession.started_at as string, timeLimit.minutes);
        if (deadline === null) return { ok: false, error: GENERIC };
        const now = Date.now();
        if (now > deadline + TIME_LIMIT_GRACE_MS) {
          return {
            ok: false,
            timeExpired: true,
            error: "Waktu pengerjaan sudah habis, jawaban tidak dapat dikirim lagi.",
          };
        }
        const late = now > deadline; // terkirim pada masa tenggang
        timeUpAuto = late || (payload.data.timeUp === true && now >= deadline - 10_000);
        timeMeta = {
          session_id: procSession.id,
          minutes: timeLimit.minutes,
          elapsed_seconds: Math.max(0, Math.round((now - Date.parse(procSession.started_at as string)) / 1000)),
          auto_submitted: timeUpAuto,
          within_grace: late,
        };
      }

      procSessionId = procSession.id as string;
      procViolationCount = procSession.violation_count as number;
    }

    // 3) Pembatasan 1 respons per akun (wajib login)
    let respondent: { id: string; email: string | null; name: string | null } | null = null;
    if (settings.oneResponsePerAccount) {
      const sb = await createClient();
      const user = await getVerifiedUser(sb);
      if (!user) return { ok: false, needsLogin: true, error: "Masuk dulu untuk mengisi form ini." };
      const dn = user.user_metadata?.display_name;
      respondent = { id: user.id, email: user.email ?? null, name: typeof dn === "string" ? dn : null };
      const { data: prior, error: priorErr } = await admin
        .from("form_submissions")
        .select("id")
        .eq("form_id", form.id)
        .eq("respondent_id", user.id)
        .limit(1);
      if (priorErr) return { ok: false, error: GENERIC };
      if (prior && prior.length > 0) return { ok: false, alreadySubmitted: true, error: ALREADY };
    }

    // 4) Validasi jawaban terhadap skema tersimpan (bukan skema dari browser)
    const schema = formSchemaJson.safeParse(form.schema_json);
    if (!schema.success) return { ok: false, error: GENERIC };
    // Diskualifikasi atau waktu habis: terima jawaban parsial (kolom wajib dilonggarkan, isian yang tidak valid dibuang)
    const partial = disqualified || timeUpAuto;
    const fieldsForCheck = partial
      ? schema.data.fields.map((f) => ({ ...f, required: false }))
      : schema.data.fields;
    const first = validateAnswers(fieldsForCheck, payload.data.answers);
    const checked =
      !first.ok && partial
        ? validateAnswers(
            fieldsForCheck,
            Object.fromEntries(Object.entries(payload.data.answers).filter(([id]) => !(id in first.errors)))
          )
        : first;
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };

    // 5) Rate limit dasar per IP per form (IP disimpan sebagai hash)
    const ipHash = await getClientIpHash();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form.id)
      .eq("metadata_json->>ip_hash", ipHash)
      .gte("submitted_at", since);
    if ((count ?? 0) >= MAX_PER_MINUTE) {
      return { ok: false, error: "Terlalu banyak pengiriman. Tunggu sebentar lalu coba lagi." };
    }

    // 5b) Verifikasi berkas unggahan: path harus milik form/kolom ini, berkas ada di storage, ukuran nyata dari storage
    for (const field of schema.data.fields) {
      if (field.type !== "file") continue;
      const claimed = checked.answers[field.id];
      if (!Array.isArray(claimed) || claimed.length === 0) continue;
      const v = await verifyUploadedFiles(admin, form.id as string, field, claimed as UploadedFile[]);
      if (!v.ok) return { ok: false, fieldErrors: { [field.id]: v.error } };
      checked.answers[field.id] = v.files;
    }

    // 6) Penilaian kuis (di server; kunci tidak pernah keluar)
    let score: QuizResult | undefined;
    if (settings.quiz) {
      const g = gradeQuiz(schema.data.fields, checked.answers);
      if (g.total > 0) score = g;
    }

    // 7) Simpan; sukses hanya dilaporkan setelah baris benar-benar tersimpan
    const metadata: Record<string, unknown> = { client_key: payload.data.clientKey, ip_hash: ipHash };
    if (score) metadata.score = score;
    if (procSessionId && procOn) {
      // Pelanggaran bersumber dari server (sesi + log), bukan dari klien, sehingga tidak bisa dipalsukan.
      // Bentuk metadata.violations dipertahankan ({ count, events: [{ k, t }] }) agar konsumen lama tetap jalan.
      const { data: vlogs } = await admin
        .from("proctoring_logs")
        .select("violation_type,occurred_at")
        .eq("session_id", procSessionId)
        .order("occurred_at", { ascending: true })
        .limit(100);
      metadata.violations = {
        count: procViolationCount,
        events: (vlogs ?? []).map((l: { violation_type: string; occurred_at: string }) => ({
          k: l.violation_type,
          t: l.occurred_at,
        })),
      };
      metadata.proctoring = {
        session_id: procSessionId,
        violation_count: procViolationCount,
        disqualified,
        timeExpired: Boolean(timeUpAuto),
      };
    } else if (procSessionId || timeLimit.enabled) {
      metadata.proctoring = {
        session_id: procSessionId ?? undefined,
        violation_count: procViolationCount,
        disqualified: false,
        timeExpired: Boolean(timeUpAuto),
      };
    }
    if (timeMeta) metadata.time_limit = timeMeta;
    if (respondent) metadata.respondent = { email: respondent.email, name: respondent.name };

    const { data: inserted, error: insErr } = await admin
      .from("form_submissions")
      .insert({
        form_id: form.id,
        answers_json: checked.answers,
        metadata_json: metadata,
        respondent_id: respondent?.id ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        // Bentrok unik: kirim ganda (kunci sama) atau akun yang sama sudah mengisi
        const { data: again } = await admin
          .from("form_submissions")
          .select("metadata_json")
          .eq("form_id", form.id)
          .eq("metadata_json->>client_key", payload.data.clientKey)
          .limit(1);
        if (again && again.length > 0) return { ok: true, result: score ?? scoreOf(again[0].metadata_json) };
        return { ok: false, alreadySubmitted: true, error: ALREADY };
      }
      console.error("submit_failed", insErr.code); // tanpa isi jawaban
      return { ok: false, error: GENERIC };
    }

    // 8) Simpan relasi berkas ke submission_files jika ada berkas yang diunggah
    if (inserted?.id) {
      const fileRows: {
        submission_id: string;
        field_id: string;
        storage_path: string;
        original_filename: string;
        mime_type: string;
        size_bytes: number;
      }[] = [];

      for (const field of schema.data.fields) {
        if (field.type === "file") {
          const files = checked.answers[field.id];
          if (Array.isArray(files)) {
            for (const file of files as UploadedFile[]) {
              fileRows.push({
                submission_id: inserted.id,
                field_id: field.id,
                storage_path: file.storagePath,
                original_filename: file.originalFilename,
                mime_type: file.mimeType,
                size_bytes: file.sizeBytes,
              });
            }
          }
        }
      }

      if (fileRows.length > 0) {
        const { error: filesErr } = await admin.from("submission_files").insert(fileRows);
        if (filesErr) {
          console.error("submit_files_failed", filesErr.message);
        }
      }

      // 9) Buat notifikasi respons formulir baru untuk pemilik formulir
      try {
        const respondentLabel = respondent?.name || respondent?.email || "Responden anonim";
        await createNotification({
          userId: form.owner_id,
          type: "form_response",
          title: disqualified
            ? "Respons Otomatis (Peserta Didiskualifikasi)"
            : timeUpAuto
              ? "Respons Otomatis (Waktu Habis)"
              : "Respons Baru Diterima",
          message: disqualified
            ? `Jawaban parsial dari ${respondentLabel} pada formulir "${form.title || "Formulir"}" dikirim otomatis karena peserta didiskualifikasi.`
            : timeUpAuto
              ? `Waktu pengerjaan ${respondentLabel} pada formulir "${form.title || "Formulir"}" habis, jawaban yang sudah terisi dikirim otomatis.`
              : `Terdapat respons baru dari ${respondentLabel} pada formulir "${form.title || "Formulir"}".`,
          link: `/dashboard/forms/${form.id}/responses`,
          metadata: {
            formId: form.id,
            submissionId: inserted.id,
            hasFiles: fileRows.length > 0,
          },
        });
      } catch (notifErr) {
        console.error("submit_notification_failed", notifErr);
      }

      // 10) Tandai sesi pengawasan ujian sebagai selesai (completed); sesi terblokir tetap terblokir
      if (procSessionId) {
        try {
          await admin
            .from("proctoring_sessions")
            .update({ status: "completed", ended_at: new Date().toISOString() })
            .eq("form_id", form.id)
            .eq("session_key", payload.data.clientKey)
            .eq("status", "in_progress");
        } catch (procErr) {
          console.error("complete_proctoring_session_failed", procErr);
        }
      }
    }

    return { ok: true, result: score };
  } catch (e) {
    console.error("submit_exception", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: GENERIC };
  }
}

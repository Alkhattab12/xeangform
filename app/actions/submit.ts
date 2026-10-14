"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { gradeQuiz } from "@/lib/forms/grade";
import { formSchemaJson, parseSettings } from "@/lib/forms/schema";
import type { UploadedFile } from "@/lib/forms/files";
import { validateAnswers } from "@/lib/forms/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { serviceRoleKey } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { createNotification } from "@/lib/notifications/create";
import { verifyUploadedFiles } from "@/lib/forms/upload-verify";

export type QuizResult = { correct: number; total: number };
export type SubmitResult =
  | { ok: true; result?: QuizResult }
  | { ok: false; error?: string; fieldErrors?: Record<string, string>; needsLogin?: boolean; alreadySubmitted?: boolean };

const slugSchema = z.string().regex(/^[a-z0-9-]{6,64}$/);
const payloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  clientKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  website: z.string().max(200).optional(), // honeypot
  violations: z
    .object({
      count: z.number().int().min(0).max(10000),
      events: z.array(z.object({ k: z.enum(["tab", "window"]), t: z.string().max(40) })).max(50),
    })
    .optional(),
});

const GENERIC = "Respons belum tersimpan. Coba kirim lagi sebentar lagi.";
const ALREADY = "Formulir ini sudah selesai kamu kerjakan. Setiap akun hanya dapat mengisi satu kali.";
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
    const checked = validateAnswers(schema.data.fields, payload.data.answers);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };

    // 5) Rate limit dasar per IP per form (IP disimpan sebagai hash)
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const ipHash = createHmac("sha256", serviceRoleKey() ?? "dev").update(ip).digest("hex").slice(0, 32);
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
    if (!settings.allowTabSwitch && payload.data.violations) metadata.violations = payload.data.violations;
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
          title: "Respons Baru Diterima",
          message: `Terdapat respons baru dari ${respondentLabel} pada formulir "${form.title || "Formulir"}".`,
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
    }

    return { ok: true, result: score };
  } catch (e) {
    console.error("submit_exception", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: GENERIC };
  }
}

"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { formSchemaJson } from "@/lib/forms/schema";
import { validateAnswers } from "@/lib/forms/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { serviceRoleKey } from "@/lib/supabase/env";

export type SubmitResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

const slugSchema = z.string().regex(/^[a-z0-9-]{6,64}$/);
const payloadSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  clientKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  website: z.string().max(200).optional(), // honeypot
});

const GENERIC = "Respons belum tersimpan. Coba kirim lagi sebentar lagi.";
const MAX_PER_MINUTE = 5;

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
      .select("id,status,schema_json")
      .eq("slug", slug)
      .maybeSingle();
    if (formErr) return { ok: false, error: GENERIC };
    if (!form || form.status !== "published") return { ok: false, error: "Form ini sudah tidak menerima respons." };

    // 2) Validasi jawaban terhadap skema tersimpan (bukan skema dari browser)
    const schema = formSchemaJson.safeParse(form.schema_json);
    if (!schema.success) return { ok: false, error: GENERIC };
    const checked = validateAnswers(schema.data.fields, payload.data.answers);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };

    // 3) Idempotensi: kirim ulang dengan kunci yang sama = sukses tanpa menyimpan dua kali
    const { data: dup } = await admin
      .from("form_submissions")
      .select("id")
      .eq("form_id", form.id)
      .eq("metadata_json->>client_key", payload.data.clientKey)
      .limit(1);
    if (dup && dup.length > 0) return { ok: true };

    // 4) Rate limit dasar per IP per form (IP disimpan sebagai hash, bukan mentah)
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

    // 5) Simpan; sukses hanya dilaporkan setelah baris benar-benar tersimpan
    const { error: insErr } = await admin.from("form_submissions").insert({
      form_id: form.id,
      answers_json: checked.answers,
      metadata_json: { client_key: payload.data.clientKey, ip_hash: ipHash },
    });
    if (insErr) {
      if (insErr.code === "23505") return { ok: true }; // balapan kirim ganda: sudah tersimpan
      console.error("submit_failed", insErr.code); // tanpa isi jawaban
      return { ok: false, error: GENERIC };
    }
    return { ok: true };
  } catch (e) {
    console.error("submit_exception", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: GENERIC };
  }
}

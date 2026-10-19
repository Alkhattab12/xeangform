"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { getClientIpHash } from "@/lib/forms/client-ip";
import { parseSettings } from "@/lib/forms/schema";
import { createNotification } from "@/lib/notifications/create";

const slugSchema = z.string().min(3).max(64);
const sessionKeySchema = z.string().min(8).max(128);
const violationTypeSchema = z.enum([
  "tab_switch",
  "window_blur",
  "fullscreen_exit",
  "navigation_attempt",
  "clipboard_restricted",
  "other",
]);

/**
 * Batas pembuatan sesi baru per IP (hash) per form dalam jendela waktu.
 * Sengaja longgar: satu kelas yang memakai jaringan/Wi-Fi yang sama harus tetap bisa masuk bersamaan.
 */
const NEW_SESSION_WINDOW_MS = 10 * 60_000;
const MAX_NEW_SESSIONS_PER_IP = 120;

export type ProctoringSessionStatus = "in_progress" | "completed" | "blocked";

export type InitSessionResult =
  | {
      ok: true;
      enabled: boolean;
      sessionId?: string;
      status?: ProctoringSessionStatus;
      violationCount?: number;
      maxViolations?: number;
      isBlocked?: boolean;
    }
  | { ok: false; error: string };

export type RecordViolationResult =
  | {
      ok: true;
      deduped?: boolean;
      violationCount: number;
      maxViolations: number;
      status: ProctoringSessionStatus;
      isBlocked: boolean;
    }
  | { ok: false; blocked?: boolean; error: string; violationCount?: number };

/**
 * Memulai atau memulihkan sesi ujian peserta (Server-Authoritative).
 * Jika sesi sudah terblokir sebelumnya, server langsung mengembalikan status blocked.
 * Untuk peserta yang login, blokir tertaut ke akun: membuka tab/browser baru tidak menghapusnya.
 */
export async function initProctoringSession(
  slug: string,
  sessionKey: string,
  clientInfo?: { respondentName?: string; respondentEmail?: string }
): Promise<InitSessionResult> {
  if (!slugSchema.safeParse(slug).success || !sessionKeySchema.safeParse(sessionKey).success) {
    return { ok: false, error: "Parameter sesi tidak valid." };
  }

  try {
    const admin = createAdminClient();

    // 1. Ambil form dan pengaturan proctoring
    const { data: form, error: formErr } = await admin
      .from("forms")
      .select("id,title,status,settings_json,owner_id")
      .eq("slug", slug)
      .maybeSingle();

    if (formErr || !form || form.status !== "published") {
      return { ok: false, error: "Formulir tidak aktif atau tidak ditemukan." };
    }

    const settings = parseSettings(form.settings_json);
    if (!settings.proctoring?.enabled) {
      return { ok: true, enabled: false };
    }

    // 2. Cek apakah peserta terautentikasi (opsional)
    let respondentId: string | null = null;
    let autoName: string | null = clientInfo?.respondentName?.trim() || null;
    let autoEmail: string | null = clientInfo?.respondentEmail?.trim() || null;

    try {
      const sb = await createClient();
      const user = await getVerifiedUser(sb);
      if (user) {
        respondentId = user.id;
        if (!autoEmail) autoEmail = user.email ?? null;
        if (!autoName) autoName = (user.user_metadata?.display_name as string) ?? null;
      }
    } catch {
      // Abaikan jika pemanggil adalah anon
    }

    // 2b. Blokir tertaut ke akun: sesi baru (tab/browser lain) tidak menghapus blokir peserta yang login
    if (respondentId) {
      const { data: blockedByAccount } = await admin
        .from("proctoring_sessions")
        .select("id,violation_count,max_violations")
        .eq("form_id", form.id)
        .eq("respondent_id", respondentId)
        .eq("status", "blocked")
        .limit(1)
        .maybeSingle();

      if (blockedByAccount) {
        return {
          ok: true,
          enabled: true,
          sessionId: blockedByAccount.id,
          status: "blocked",
          violationCount: blockedByAccount.violation_count,
          maxViolations: blockedByAccount.max_violations,
          isBlocked: true,
        };
      }
    }

    // 3. Cek apakah sesi sudah ada
    const { data: existing, error: findErr } = await admin
      .from("proctoring_sessions")
      .select("id,status,violation_count,max_violations")
      .eq("form_id", form.id)
      .eq("session_key", sessionKey)
      .maybeSingle();

    if (findErr) {
      console.error("init_proctoring_find_failed", findErr.message);
      return { ok: false, error: "Gagal memverifikasi status sesi ujian." };
    }

    if (existing) {
      const isBlocked = existing.status === "blocked" || existing.violation_count >= existing.max_violations;
      return {
        ok: true,
        enabled: true,
        sessionId: existing.id,
        status: existing.status as ProctoringSessionStatus,
        violationCount: existing.violation_count,
        maxViolations: existing.max_violations,
        isBlocked,
      };
    }

    // 3b. Pembatas pembuatan sesi baru per IP per form (cegah pembanjiran tabel)
    const ipHash = await getClientIpHash();
    const since = new Date(Date.now() - NEW_SESSION_WINDOW_MS).toISOString();
    const { count: recentCount } = await admin
      .from("proctoring_sessions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form.id)
      .eq("metadata_json->>ip_hash", ipHash)
      .gte("created_at", since);

    if ((recentCount ?? 0) >= MAX_NEW_SESSIONS_PER_IP) {
      return { ok: false, error: "Terlalu banyak sesi baru dari jaringan ini. Tunggu beberapa menit lalu coba lagi." };
    }

    // 4. Jika belum ada, buat sesi baru
    const maxViolations = settings.proctoring.maxViolations ?? 3;
    const { data: created, error: insErr } = await admin
      .from("proctoring_sessions")
      .insert({
        form_id: form.id,
        session_key: sessionKey,
        respondent_id: respondentId,
        respondent_name: autoName,
        respondent_email: autoEmail,
        status: "in_progress",
        violation_count: 0,
        max_violations: maxViolations,
        metadata_json: { ip_hash: ipHash },
      })
      .select("id,status,violation_count,max_violations")
      .single();

    if (insErr) {
      console.error("init_proctoring_insert_failed", insErr.message);
      // Jika terjadi bentrok unique concurrent, coba cari lagi
      const { data: retry } = await admin
        .from("proctoring_sessions")
        .select("id,status,violation_count,max_violations")
        .eq("form_id", form.id)
        .eq("session_key", sessionKey)
        .maybeSingle();

      if (retry) {
        return {
          ok: true,
          enabled: true,
          sessionId: retry.id,
          status: retry.status as ProctoringSessionStatus,
          violationCount: retry.violation_count,
          maxViolations: retry.max_violations,
          isBlocked: retry.status === "blocked" || retry.violation_count >= retry.max_violations,
        };
      }
      return { ok: false, error: "Gagal menginisialisasi sesi pengawasan." };
    }

    return {
      ok: true,
      enabled: true,
      sessionId: created.id,
      status: created.status as ProctoringSessionStatus,
      violationCount: created.violation_count,
      maxViolations: created.max_violations,
      isBlocked: false,
    };
  } catch (err) {
    console.error("init_proctoring_exception", err);
    return { ok: false, error: "Terjadi kesalahan internal server." };
  }
}

/**
 * Mencatat pelanggaran ke database secara otoritatif di backend.
 * Menerapkan deduplikasi / debounce (3 detik) agar 1 tindakan tidak menghasilkan beberapa pelanggaran ganda.
 * Jika mencapai batas maksimal, otomatis memblokir sesi dan mengirim notifikasi prioritas ke pemilik form.
 */
export async function recordProctoringViolation(
  slug: string,
  sessionKey: string,
  violationType: string,
  message: string,
  details?: Record<string, unknown>
): Promise<RecordViolationResult> {
  if (!slugSchema.safeParse(slug).success || !sessionKeySchema.safeParse(sessionKey).success) {
    return { ok: false, error: "Parameter tidak valid." };
  }

  const vType = violationTypeSchema.safeParse(violationType).success
    ? (violationType as z.infer<typeof violationTypeSchema>)
    : "other";

  try {
    const admin = createAdminClient();

    // 1. Ambil form
    const { data: form } = await admin
      .from("forms")
      .select("id,title,status,settings_json,owner_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!form) return { ok: false, error: "Formulir tidak ditemukan." };
    const settings = parseSettings(form.settings_json);
    if (!settings.proctoring?.enabled) {
      return { ok: false, error: "Anti-cheating tidak aktif pada formulir ini." };
    }

    // 2. Ambil sesi pengerjaan saat ini
    const { data: session, error: sessErr } = await admin
      .from("proctoring_sessions")
      .select("id,status,violation_count,max_violations,last_violation_at,respondent_name,respondent_email")
      .eq("form_id", form.id)
      .eq("session_key", sessionKey)
      .maybeSingle();

    if (sessErr || !session) {
      return { ok: false, error: "Sesi ujian tidak valid atau belum terdaftar." };
    }

    // Jika sudah diblokir, tolak penambahan
    if (session.status === "blocked" || session.violation_count >= session.max_violations) {
      return {
        ok: false,
        blocked: true,
        error: "Sesi ini telah dihentikan dan diblokir secara permanen.",
        violationCount: session.violation_count,
      };
    }

    // 3. Deduplikasi / Debounce (cooldown 3 detik)
    // Menghindari alt-tab / klik jendela memicu window_blur dan visibilitychange sekaligus
    const now = Date.now();
    const lastAt = session.last_violation_at ? new Date(session.last_violation_at).getTime() : 0;
    if (now - lastAt < 3000) {
      return {
        ok: true,
        deduped: true,
        violationCount: session.violation_count,
        maxViolations: session.max_violations,
        status: session.status as ProctoringSessionStatus,
        isBlocked: false,
      };
    }

    // 4. Hitung pelanggaran baru
    const nextCount = session.violation_count + 1;
    const isNowBlocked = nextCount >= session.max_violations;
    const nextStatus: ProctoringSessionStatus = isNowBlocked ? "blocked" : "in_progress";
    const nowIso = new Date(now).toISOString();

    // 5. Update tabel proctoring_sessions (compare-and-set pada violation_count:
    //    jika dua event datang bersamaan, hanya satu yang berhasil menambah hitungan)
    const { data: updatedRows, error: updateErr } = await admin
      .from("proctoring_sessions")
      .update({
        violation_count: nextCount,
        status: nextStatus,
        last_violation_at: nowIso,
        ended_at: isNowBlocked ? nowIso : null,
      })
      .eq("id", session.id)
      .eq("violation_count", session.violation_count)
      .select("id");

    if (updateErr) {
      console.error("update_proctoring_session_failed", updateErr.message);
      return { ok: false, error: "Gagal memperbarui status pelanggaran." };
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Event lain sudah memperbarui sesi lebih dulu: jangan hitung ganda.
      return {
        ok: true,
        deduped: true,
        violationCount: session.violation_count,
        maxViolations: session.max_violations,
        status: session.status as ProctoringSessionStatus,
        isBlocked: false,
      };
    }

    // 6. Simpan detail log kejadian di proctoring_logs
    await admin.from("proctoring_logs").insert({
      session_id: session.id,
      form_id: form.id,
      violation_type: vType,
      violation_number: nextCount,
      message: message.trim().slice(0, 500),
      details_json: details ?? {},
    });

    // 7. Notifikasi Real-Time ke Pemilik Form
    if (settings.proctoring.notifyOwnerOnViolation) {
      const respondentLabel =
        session.respondent_name ||
        session.respondent_email ||
        `Peserta (ID: ${sessionKey.slice(0, 8)})`;

      if (isNowBlocked) {
        await createNotification({
          userId: form.owner_id,
          type: "proctoring_violation",
          title: `PESERTA DIBLOKIR: ${respondentLabel} (${nextCount}/${session.max_violations})`,
          message: `Peserta ${respondentLabel} pada form "${form.title}" telah otomatis dihentikan dan diblokir setelah mencapai batas ${session.max_violations} pelanggaran (${message}).`,
          link: `/dashboard/forms/${form.id}/violations`,
          metadata: {
            formId: form.id,
            sessionId: session.id,
            count: nextCount,
            max: session.max_violations,
            blocked: true,
          },
        });
      } else {
        await createNotification({
          userId: form.owner_id,
          type: "proctoring_violation",
          title: `Pelanggaran Baru: ${respondentLabel} (${nextCount}/${session.max_violations})`,
          message: `Terdeteksi aktivitas tidak diizinkan: ${message} pada form "${form.title}".`,
          link: `/dashboard/forms/${form.id}/violations`,
          metadata: {
            formId: form.id,
            sessionId: session.id,
            count: nextCount,
            max: session.max_violations,
            blocked: false,
          },
        });
      }
    }

    return {
      ok: true,
      violationCount: nextCount,
      maxViolations: session.max_violations,
      status: nextStatus,
      isBlocked: isNowBlocked,
    };
  } catch (err) {
    console.error("record_violation_exception", err);
    return { ok: false, error: "Terjadi kesalahan internal saat mencatat pelanggaran." };
  }
}

/**
 * Pemilik form membuka blokir peserta (Unblock) dengan audit log.
 * Hitungan pelanggaran direset ke 0, karena init/record memakai violation_count >= max_violations
 * sebagai penanda blokir; tanpa reset peserta langsung terblokir lagi. Riwayat tetap ada di proctoring_logs.
 */
export async function unblockProctoringSession(
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const sb = await createClient();
    const user = await getVerifiedUser(sb);
    if (!user) return { ok: false, error: "Akses tidak diizinkan." };

    const admin = createAdminClient();

    // Pastikan session milik form yang di-own oleh user ini
    const { data: session } = await admin
      .from("proctoring_sessions")
      .select("id,form_id,violation_count,metadata_json,forms(owner_id)")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return { ok: false, error: "Sesi tidak ditemukan." };

    // Cek kepemilikan form
    const formOwner = (session.forms as unknown as { owner_id: string })?.owner_id;
    if (formOwner !== user.id) {
      return { ok: false, error: "Anda bukan pemilik form ini." };
    }

    const currentMeta = session.metadata_json && typeof session.metadata_json === "object"
      ? (session.metadata_json as Record<string, unknown>)
      : {};

    const unblockLogs = Array.isArray(currentMeta.unblock_history)
      ? currentMeta.unblock_history
      : [];

    unblockLogs.push({
      unblocked_by: user.id,
      unblocked_at: new Date().toISOString(),
      previous_violation_count: session.violation_count,
    });

    const { error: updateErr } = await admin
      .from("proctoring_sessions")
      .update({
        status: "in_progress",
        violation_count: 0,
        ended_at: null,
        last_violation_at: null,
        metadata_json: { ...currentMeta, unblock_history: unblockLogs },
      })
      .eq("id", sessionId);

    if (updateErr) return { ok: false, error: "Gagal memperbarui status sesi." };

    revalidatePath(`/dashboard/forms/${session.form_id}/violations`);
    return { ok: true };
  } catch (err) {
    console.error("unblock_session_exception", err);
    return { ok: false, error: "Gagal memproses pembukaan blokir." };
  }
}

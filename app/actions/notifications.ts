"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uuidV5 } from "@/lib/notifications/ids";
import { mapNotificationRow, type NotificationItem, type NotificationRow } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();

export type NotificationsResult =
  | { ok: true; notifications: NotificationItem[]; unreadCount: number }
  | { ok: false; error: string; notifications: NotificationItem[]; unreadCount: number };

export type ActionResult = { ok: true } | { ok: false; error: string };

type Db = Awaited<ReturnType<typeof createClient>>;
const SEEDED_FLAG = "notif_seeded";

/**
 * Pengumuman fitur awal. Dibuat SEKALI per akun:
 *  - penanda `notif_seeded` disimpan di user_metadata, jadi menghapus semua notifikasi tidak memicu seed ulang;
 *  - id baris deterministik (UUID v5) + ON CONFLICT DO NOTHING, jadi pemanggilan bersamaan tidak membuat duplikat;
 *  - akun yang sudah punya notifikasi hanya diberi penanda (tidak ditambah baris).
 * Tanpa migrasi database; berjalan dengan RLS user biasa.
 */
async function seedInitialAnnouncementsOnce(db: Db, user: { id: string; user_metadata?: Record<string, unknown> }) {
  try {
    if (user.user_metadata?.[SEEDED_FLAG] === true) return;

    const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id);

    if (count === 0) {
      await db.from("notifications").upsert(
        [
          {
            id: uuidV5(`announce:${user.id}:notification-center`),
            user_id: user.id,
            type: "product_update",
            title: "Notification Center Aktif",
            message:
              "Pusat Notifikasi terpadu kini aktif untuk memantau respons formulir masuk, status publikasi, dan aktivitas penting secara real-time.",
            link: "/dashboard",
            metadata_json: { tag: "feature_release" },
            is_read: false,
          },
          {
            id: uuidV5(`announce:${user.id}:audio-studio`),
            user_id: user.id,
            type: "product_update",
            title: "Studio Audio & Nada Latar",
            message:
              "Kustomisasi audio latar kini mendukung pustaka multi-track, upload mandiri hingga 15 MB, dan pemutar audio interaktif untuk responden.",
            link: "/dashboard",
            metadata_json: { tag: "audio_release" },
            is_read: false,
          },
        ],
        { onConflict: "id", ignoreDuplicates: true },
      );
    }

    await db.auth.updateUser({ data: { [SEEDED_FLAG]: true } });
  } catch {
    // Abaikan jika tabel belum ada atau gagal; akan dicoba lagi pada pemanggilan berikutnya
  }
}

function isVerified(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null): boolean {
  return Boolean(user && (user.email_confirmed_at || user.confirmed_at));
}

/**
 * Mengambil daftar notifikasi pengguna terbaru beserta jumlah belum dibaca.
 */
export async function getNotificationsAction(limit = 30): Promise<NotificationsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isVerified(user)) {
      return { ok: false, error: "Silakan masuk dan konfirmasi email terlebih dahulu.", notifications: [], unreadCount: 0 };
    }

    const db = supabase; // RLS (notifications_user_*) sudah membatasi ke baris milik user

    await seedInitialAnnouncementsOnce(db, user);

    const [listRes, countRes] = await Promise.all([
      db
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100)),
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    if (listRes.error) {
      console.error("fetch_notifications_error", listRes.error.message);
      return { ok: false, error: "Gagal memuat notifikasi.", notifications: [], unreadCount: 0 };
    }

    const rows = (listRes.data || []) as NotificationRow[];
    const items = rows.map(mapNotificationRow);
    const unreadCount = countRes.count ?? items.filter((i) => !i.isRead).length;

    return {
      ok: true,
      notifications: items,
      unreadCount,
    };
  } catch (err) {
    console.error("get_notifications_exception", err);
    return { ok: false, error: "Terjadi kesalahan saat memuat notifikasi.", notifications: [], unreadCount: 0 };
  }
}

/**
 * Menandai satu notifikasi sebagai sudah dibaca.
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(notificationId).success) {
    return { ok: false, error: "ID notifikasi tidak valid." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isVerified(user)) {
      return { ok: false, error: "Sesi berakhir atau email belum dikonfirmasi." };
    }

    const db = supabase; // RLS membatasi ke baris milik user
    const { error } = await db
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("mark_read_error", error.message);
      return { ok: false, error: "Gagal memperbarui status notifikasi." };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("mark_read_exception", err);
    return { ok: false, error: "Terjadi kesalahan sistem." };
  }
}

/**
 * Menandai semua notifikasi milik pengguna sebagai sudah dibaca.
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isVerified(user)) {
      return { ok: false, error: "Sesi berakhir atau email belum dikonfirmasi." };
    }

    const db = supabase; // RLS membatasi ke baris milik user
    const { error } = await db
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("mark_all_read_error", error.message);
      return { ok: false, error: "Gagal menandai seluruh notifikasi." };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("mark_all_read_exception", err);
    return { ok: false, error: "Terjadi kesalahan sistem." };
  }
}

/**
 * Menghapus notifikasi spesifik milik pengguna.
 */
export async function deleteNotificationAction(notificationId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(notificationId).success) {
    return { ok: false, error: "ID notifikasi tidak valid." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isVerified(user)) {
      return { ok: false, error: "Sesi berakhir atau email belum dikonfirmasi." };
    }

    const db = supabase; // RLS membatasi ke baris milik user
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("delete_notification_error", error.message);
      return { ok: false, error: "Gagal menghapus notifikasi." };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("delete_notification_exception", err);
    return { ok: false, error: "Terjadi kesalahan sistem." };
  }
}

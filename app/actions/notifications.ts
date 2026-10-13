"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapNotificationRow, type NotificationItem, type NotificationRow, type NotificationType } from "@/lib/notifications/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { serviceRoleKey } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();
const typeSchema = z.enum(["form_response", "product_update", "system"]);

export type NotificationsResult =
  | { ok: true; notifications: NotificationItem[]; unreadCount: number }
  | { ok: false; error: string; notifications: NotificationItem[]; unreadCount: number };

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mendapatkan database client yang aman untuk server actions:
 * Menggunakan admin client jika service role key tersedia, atau client user biasa dengan RLS.
 */
function getSafeDb(userClient: Awaited<ReturnType<typeof createClient>>) {
  try {
    if (serviceRoleKey()) {
      return createAdminClient();
    }
  } catch {
    // Gunakan userClient jika serviceRoleKey tidak tersedia
  }
  return userClient;
}

/**
 * Menyediakan pengumuman fitur resmi awal jika pengguna belum memiliki riwayat notifikasi.
 */
async function seedInitialAnnouncementsIfEmpty(db: ReturnType<typeof getSafeDb>, userId: string) {
  try {
    const { count } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (count === 0) {
      await db.from("notifications").insert([
        {
          user_id: userId,
          type: "product_update",
          title: "Notification Center Aktif",
          message:
            "Pusat Notifikasi terpadu kini aktif untuk memantau respons formulir masuk, status publikasi, dan aktivitas penting secara real-time.",
          link: "/dashboard",
          metadata_json: { tag: "feature_release" },
          is_read: false,
        },
        {
          user_id: userId,
          type: "product_update",
          title: "Studio Audio & Nada Latar",
          message:
            "Kustomisasi audio latar kini mendukung pustaka multi-track, upload mandiri hingga 15 MB, dan pemutar audio interaktif untuk responden.",
          link: "/dashboard",
          metadata_json: { tag: "audio_release" },
          is_read: false,
        },
      ]);
    }
  } catch {
    // Abaikan jika tabel belum ada atau insert gagal
  }
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

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu.", notifications: [], unreadCount: 0 };
    }

    const db = getSafeDb(supabase);

    // Cek pengumuman awal jika belum ada data sama sekali
    await seedInitialAnnouncementsIfEmpty(db, user.id);

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

    if (!user) {
      return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const db = getSafeDb(supabase);
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

    if (!user) {
      return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const db = getSafeDb(supabase);
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

    if (!user) {
      return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const db = getSafeDb(supabase);
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

/**
 * Helper sisi server untuk membuat notifikasi baru dari peristiwa sistem (misal respons formulir baru atau publikasi form).
 * Menggunakan admin client (service-role) sehingga aman dan tidak dibatasi RLS.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; id?: string }> {
  try {
    if (!uuidSchema.safeParse(params.userId).success) return { ok: false };
    if (!typeSchema.safeParse(params.type).success) return { ok: false };

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      // Jika service role key belum disetel, lewati
      return { ok: false };
    }

    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title.trim().slice(0, 200),
        message: params.message.trim().slice(0, 1000),
        link: params.link ? params.link.trim().slice(0, 500) : null,
        metadata_json: params.metadata || {},
        is_read: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("create_notification_failed", error.message);
      return { ok: false };
    }

    return { ok: true, id: data.id };
  } catch (e) {
    console.error("create_notification_exception", e);
    return { ok: false };
  }
}

import "server-only";
import { uuidSchemaLoose } from "./ids";
import type { NotificationType } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES: NotificationType[] = ["form_response", "product_update", "system", "proctoring_violation"];

/**
 * Membuat notifikasi dari peristiwa sistem (respons baru, form terbit).
 * Sengaja BUKAN server action: berada di modul `server-only`, jadi tidak pernah menjadi endpoint
 * yang bisa dipanggil dari browser. Memakai service role karena menulis untuk user lain (pemilik form).
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
    if (!uuidSchemaLoose(params.userId)) return { ok: false };
    if (!TYPES.includes(params.type)) return { ok: false };

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return { ok: false }; // service role key belum disetel
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

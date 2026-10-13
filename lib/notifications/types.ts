export type NotificationType = "form_response" | "product_update" | "system";

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

export function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type as NotificationType) || "system",
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: Boolean(row.is_read),
    metadata: row.metadata_json && typeof row.metadata_json === "object" ? row.metadata_json : {},
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

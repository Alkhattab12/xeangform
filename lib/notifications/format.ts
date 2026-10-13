import type { NotificationType } from "./types";

/**
 * Format timestamp menjadi representasi waktu relatif bahasa Indonesia yang ramah pengguna.
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Baru saja";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Waktu tidak valid";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 30) return "Baru saja";
  if (diffSec < 60) return `${Math.max(1, diffSec)} detik lalu`;
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    label: string;
    badgeTone: string;
    iconBg: string;
    borderTone: string;
  }
> = {
  form_response: {
    label: "Respons Form",
    badgeTone: "bg-lime text-ink",
    iconBg: "bg-lime text-ink",
    borderTone: "border-lime",
  },
  product_update: {
    label: "Pembaruan",
    badgeTone: "bg-cobalt text-white",
    iconBg: "bg-cobalt text-white",
    borderTone: "border-cobalt",
  },
  system: {
    label: "Sistem",
    badgeTone: "bg-orange text-ink",
    iconBg: "bg-orange text-ink",
    borderTone: "border-orange",
  },
};

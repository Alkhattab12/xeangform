"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCheck, RefreshCw, X, BellOff, Inbox, ExternalLink } from "lucide-react";
import { NotificationItemView } from "./NotificationItemView";
import type { NotificationItem } from "@/lib/notifications/types";

type NotificationPanelProps = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
};

export function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const displayedNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.isRead;
    return true;
  });

  const handleMarkAll = async () => {
    if (isProcessingAll || unreadCount === 0) return;
    setIsProcessingAll(true);
    try {
      await onMarkAllAsRead();
    } finally {
      setIsProcessingAll(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Pusat Notifikasi"
      aria-modal="true"
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px] max-h-[75vh] flex flex-col border-[3px] border-line bg-surface shadow-[6px_6px_0_var(--shadow-color)] z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-[3px] border-line bg-paper px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-fg">
            Notifikasi
          </h3>
          {unreadCount > 0 && (
            <span className="nb-mono px-1.5 py-0.2 bg-orange text-ink border border-line text-[11px] font-bold">
              {unreadCount} baru
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Muat ulang"
            aria-label="Muat ulang notifikasi"
            className="inline-flex h-7 w-7 items-center justify-center border border-line bg-surface hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Tutup"
            aria-label="Tutup panel notifikasi"
            className="inline-flex h-7 w-7 items-center justify-center border border-line bg-surface hover:bg-orange transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter bar & Actions */}
      <div className="flex items-center justify-between border-b-2 border-line bg-surface px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 font-bold font-display border border-line transition-all ${
              filter === "all"
                ? "bg-accent text-ink shadow-[2px_2px_0_var(--shadow-color)]"
                : "bg-surface hover:bg-paper"
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-2.5 py-1 font-bold font-display border border-line transition-all ${
              filter === "unread"
                ? "bg-orange text-ink shadow-[2px_2px_0_var(--shadow-color)]"
                : "bg-surface hover:bg-paper"
            }`}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isProcessingAll}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-fg/80 hover:text-cobalt disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Tandai dibaca</span>
          </button>
        )}
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-line bg-surface">
        {loading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border-2 border-line bg-paper/50 p-3 space-y-2 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-fg/20" />
                  <div className="h-3 w-12 bg-fg/20" />
                </div>
                <div className="h-4 w-40 bg-fg/30" />
                <div className="h-3 w-full bg-fg/20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center border-2 border-line bg-orange text-ink">
              <BellOff className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-fg">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 nb-btn nb-btn-ghost text-xs px-3 py-1.5 min-h-0"
            >
              Coba Lagi
            </button>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center border-2 border-line bg-accent text-ink shadow-[2px_2px_0_var(--shadow-color)]">
              <Inbox className="h-6 w-6" />
            </div>
            <h4 className="font-display text-sm font-bold text-fg">
              {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}
            </h4>
            <p className="mt-1 text-xs text-fg/70">
              {filter === "unread"
                ? "Semua notifikasi kamu sudah terbaca dengan baik."
                : "Respons formulir masuk dan pengumuman sistem akan tampil di sini."}
            </p>
          </div>
        ) : (
          displayedNotifications.map((item) => (
            <NotificationItemView
              key={item.id}
              item={item}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
              onSelect={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t-[3px] border-line bg-paper px-4 py-2.5 flex items-center justify-between">
        <span className="nb-mono text-[10px] text-fg/70">
          Pusat Notifikasi Syamil Form
        </span>
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-xs font-bold font-display text-fg hover:text-cobalt hover:underline"
        >
          <span>Halaman Penuh</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

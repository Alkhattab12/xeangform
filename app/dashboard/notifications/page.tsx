"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, FileText, Inbox, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { NotificationItemView } from "@/components/notifications/NotificationItemView";
import {
  deleteNotificationAction,
  getNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/app/actions/notifications";
import type { NotificationItem, NotificationType } from "@/lib/notifications/types";

type FilterType = "all" | "unread" | NotificationType;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificationsAction(100);
      if (res.ok) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Gagal memuat notifikasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationAsReadAction(id);
  };

  const handleMarkAll = async () => {
    if (isProcessing || unreadCount === 0) return;
    setIsProcessing(true);
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      await markAllNotificationsAsReadAction();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (item && !item.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    await deleteNotificationAction(id);
  };

  const filteredItems = notifications.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.isRead;
    return item.type === filter;
  });

  const responseCount = notifications.filter((n) => n.type === "form_response").length;
  const updateCount = notifications.filter((n) => n.type === "product_update").length;
  const systemCount = notifications.filter((n) => n.type === "system").length;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-5 py-8 sm:py-10 min-w-0 w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="nb-btn nb-btn-ghost min-h-9 px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-line pb-6">
        <div>
          <span className="nb-mono">PUSAT NOTIFIKASI</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-fg">
            Notifikasi & Aktivitas
          </h1>
          <p className="mt-1 text-sm text-fg/80 max-w-xl">
            Pantau seluruh respons formulir yang masuk, status publikasi, dan informasi pembaruan sistem secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-xs"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isProcessing}
              className="nb-btn min-h-10 px-4 py-2 text-xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Summary */}
      <section aria-label="Ringkasan Notifikasi" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="nb-panel p-3 sm:p-4 border-[2px] bg-surface">
          <span className="nb-mono text-[10px] sm:text-xs">TOTAL NOTIFIKASI</span>
          <p className="font-display text-2xl sm:text-3xl font-bold mt-1 text-fg">{notifications.length}</p>
        </div>
        <div className="nb-panel p-3 sm:p-4 border-[2px] bg-orange/20">
          <span className="nb-mono text-[10px] sm:text-xs">BELUM DIBACA</span>
          <p className="font-display text-2xl sm:text-3xl font-bold mt-1 text-fg">{unreadCount}</p>
        </div>
        <div className="nb-panel p-3 sm:p-4 border-[2px] bg-lime/20">
          <span className="nb-mono text-[10px] sm:text-xs">RESPONS MASUK</span>
          <p className="font-display text-2xl sm:text-3xl font-bold mt-1 text-fg">{responseCount}</p>
        </div>
        <div className="nb-panel p-3 sm:p-4 border-[2px] bg-cobalt/15">
          <span className="nb-mono text-[10px] sm:text-xs">PEMBARUAN FITUR</span>
          <p className="font-display text-2xl sm:text-3xl font-bold mt-1 text-fg">{updateCount + systemCount}</p>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b-2 border-line pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${
            filter === "all" ? "nb-btn" : "nb-btn-ghost shadow-none"
          }`}
        >
          Semua ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${
            filter === "unread" ? "bg-orange text-ink" : "nb-btn-ghost shadow-none"
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter("form_response")}
          className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${
            filter === "form_response" ? "bg-lime text-ink" : "nb-btn-ghost shadow-none"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Respons Form ({responseCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("product_update")}
          className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${
            filter === "product_update" ? "bg-cobalt text-white" : "nb-btn-ghost shadow-none"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Pembaruan ({updateCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("system")}
          className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${
            filter === "system" ? "bg-surface border-2 border-line" : "nb-btn-ghost shadow-none"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Sistem ({systemCount})</span>
        </button>
      </div>

      {/* Main List Container */}
      <div className="mt-6 nb-panel border-[3px] bg-surface shadow-[4px_4px_0_var(--shadow-color)] divide-y-2 divide-line">
        {loading && notifications.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border-2 border-line p-4 space-y-2 animate-pulse bg-paper/40">
                <div className="h-4 w-32 bg-fg/20" />
                <div className="h-5 w-64 bg-fg/30" />
                <div className="h-3 w-full bg-fg/20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center border-2 border-line bg-orange text-ink">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-fg">Gagal Memuat Notifikasi</h3>
            <p className="mt-1 text-sm text-fg/70">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 nb-btn min-h-10 px-4 py-2 text-xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center border-2 border-line bg-accent text-ink shadow-[3px_3px_0_var(--shadow-color)]">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="font-display text-base font-bold text-fg">
              {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Tidak ada notifikasi untuk kategori ini"}
            </h3>
            <p className="mt-1 text-sm text-fg/70 max-w-sm mx-auto">
              {filter === "unread"
                ? "Semua notifikasi kamu telah dibaca."
                : "Aktivitas baru yang sesuai dengan kategori ini akan langsung muncul di sini."}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <NotificationItemView
              key={item.id}
              item={item}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </main>
  );
}

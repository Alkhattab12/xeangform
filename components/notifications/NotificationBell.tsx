"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";
import {
  deleteNotificationAction,
  getNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/app/actions/notifications";
import { useReducedMotion } from "@/components/analytics/useReducedMotion";
import type { NotificationItem } from "@/lib/notifications/types";
import { getBrowserClient } from "@/lib/supabase/client";

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animasi Bubble Press
  const [isPressing, setIsPressing] = useState(false);
  const [showBubbleRing, setShowBubbleRing] = useState(false);
  const reducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ambil notifikasi dari server
  const loadNotifications = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const res = await getNotificationsAction();
        if (res.ok) {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        } else {
          setError(res.error);
        }
      } catch {
        setError("Gagal memuat notifikasi.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    []
  );

  // Initial load & Polling cadangan (setiap 30 detik saat window aktif)
  useEffect(() => {
    loadNotifications(true);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadNotifications(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Integrasi Supabase Realtime
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`realtime:notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  // Tutup panel jika klik di luar atau tekan tombol Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Handler interaksi Bubble Press
  const handlePointerDown = () => {
    setIsPressing(true);
    if (!reducedMotion) {
      setShowBubbleRing(true);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        setShowBubbleRing(false);
      }, 450);
    }
  };

  const handlePointerUp = () => {
    setIsPressing(false);
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        // Ambil data terbaru saat panel dibuka
        loadNotifications(false);
      }
      return next;
    });
  };

  // Optimistic update untuk status baca tunggal
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationAsReadAction(id);
  };

  // Optimistic update untuk tandai semua dibaca
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  };

  // Optimistic update untuk hapus notifikasi
  const handleDelete = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (item && !item.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    await deleteNotificationAction(id);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Tombol Lonceng dengan Bubble Press Effect */}
      <button
        type="button"
        onClick={handleToggle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-label="Pusat Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`nb-bell-btn ${isPressing ? "is-pressing" : ""}`}
      >
        {/* Gelembung transparan yang mengembang saat tombol ditekan */}
        {showBubbleRing && <span className="nb-bubble-ring" aria-hidden="true" />}

        {/* Ikon Lonceng */}
        <Bell className="h-5 w-5" strokeWidth={2.2} />

        {/* Badge Jumlah Belum Dibaca */}
        {unreadCount > 0 && (
          <span
            className="nb-mono absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center border-2 border-line bg-orange px-1 text-[10px] font-bold text-ink shadow-[1px_1px_0_var(--shadow-color)] nb-badge-pop"
            aria-label={`${unreadCount} notifikasi belum dibaca`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel Pusat Notifikasi */}
      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDelete}
          onRefresh={() => loadNotifications(true)}
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Check, FileText, Sparkles, Bell, Trash2, ArrowRight } from "lucide-react";
import { formatRelativeTime, NOTIFICATION_CONFIG } from "@/lib/notifications/format";
import type { NotificationItem } from "@/lib/notifications/types";

type NotificationItemProps = {
  item: NotificationItem;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: () => void;
};

export function NotificationItemView({
  item,
  onMarkAsRead,
  onDelete,
  onSelect,
}: NotificationItemProps) {
  const config = NOTIFICATION_CONFIG[item.type] ?? NOTIFICATION_CONFIG.system;

  const renderIcon = () => {
    switch (item.type) {
      case "form_response":
        return <FileText className="h-4 w-4" strokeWidth={2.5} />;
      case "product_update":
        return <Sparkles className="h-4 w-4" strokeWidth={2.5} />;
      case "system":
      default:
        return <Bell className="h-4 w-4" strokeWidth={2.5} />;
    }
  };

  const handleCardClick = () => {
    if (!item.isRead && onMarkAsRead) {
      onMarkAsRead(item.id);
    }
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div
      className={`group relative p-3.5 transition-colors duration-150 ${
        item.isRead ? "bg-surface hover:bg-paper/40" : "bg-paper/85 hover:bg-paper"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border-2 border-line ${config.iconBg}`}
          aria-hidden="true"
        >
          {renderIcon()}
        </div>

        {/* Content body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`nb-mono px-1.5 py-0.5 text-[10px] font-bold border border-line ${config.badgeTone}`}>
                {config.label}
              </span>
              <span className="nb-mono text-[10px] text-fg/60">
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>

            {/* Unread indicator */}
            {!item.isRead && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange border border-line"
                title="Belum dibaca"
                aria-label="Belum dibaca"
              />
            )}
          </div>

          <h4 className="mt-1 text-sm font-bold font-display leading-snug text-fg">
            {item.title}
          </h4>

          <p className="mt-1 text-xs text-fg/80 leading-relaxed break-words">
            {item.message}
          </p>

          {/* Quick actions & link */}
          <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-line/15">
            {item.link ? (
              <Link
                href={item.link}
                onClick={handleCardClick}
                className="inline-flex items-center gap-1 text-xs font-bold text-cobalt hover:underline focus-visible:underline"
              >
                <span>Buka</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1">
              {!item.isRead && onMarkAsRead && (
                <button
                  type="button"
                  onClick={() => onMarkAsRead(item.id)}
                  title="Tandai sudah dibaca"
                  aria-label="Tandai sudah dibaca"
                  className="inline-flex h-7 w-7 items-center justify-center border border-line bg-surface hover:bg-accent text-fg transition-colors"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  title="Hapus notifikasi"
                  aria-label="Hapus notifikasi"
                  className="inline-flex h-7 w-7 items-center justify-center border border-line bg-surface hover:bg-orange text-fg transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Unlock,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Monitor,
  Ban,
  CheckCircle,
} from "lucide-react";
import { unblockProctoringSession } from "@/app/actions/proctoring";

export type SessionItem = {
  id: string;
  formId: string;
  sessionKey: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: "in_progress" | "completed" | "blocked";
  violationCount: number;
  maxViolations: number;
  startedAt: string;
  endedAt: string | null;
  lastViolationAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  logs: ViolationLogItem[];
};

export type ViolationLogItem = {
  id: string;
  sessionId: string;
  violationType: string;
  violationNumber: number;
  message: string;
  occurredAt: string;
  details: Record<string, unknown>;
};

type Props = {
  formId: string;
  formTitle: string;
  slug: string;
  sessions: SessionItem[];
  antiCheatingEnabled: boolean;
};

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Perpindahan Tab Browser",
  window_blur: "Kehilangan Fokus Jendela",
  fullscreen_exit: "Keluar Mode Layar Penuh",
  navigation_attempt: "Upaya Meninggalkan Halaman",
  clipboard_restricted: "Upaya Salin-Tempel (Copy/Paste)",
  other: "Aktivitas Mencurigakan Lainnya",
};

export function ViolationMonitor({ formId, formTitle, slug, sessions, antiCheatingEnabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "in_progress" | "blocked" | "completed">("all");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  const totalSessions = sessions.length;
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress").length;
  const blockedSessions = sessions.filter((s) => s.status === "blocked").length;
  const cleanSessions = sessions.filter((s) => s.violationCount === 0).length;
  const warnedSessions = sessions.filter((s) => s.violationCount > 0 && s.status !== "blocked").length;

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleUnblock = async (sessionId: string) => {
    if (!confirm("Buka blokir untuk peserta ini? Peserta akan diizinkan melanjutkan pengerjaan kembali.")) return;
    setUnblockingId(sessionId);
    setFeedback(null);
    try {
      const res = await unblockProctoringSession(sessionId);
      if (res.ok) {
        setFeedback({ kind: "success", msg: "Blokir sesi berhasil dibuka. Riwayat tindakan tercatat di audit log." });
        startTransition(() => {
          router.refresh();
        });
      } else {
        setFeedback({ kind: "error", msg: res.error || "Gagal membuka blokir." });
      }
    } catch {
      setFeedback({ kind: "error", msg: "Terjadi kesalahan internal saat membuka blokir." });
    } finally {
      setUnblockingId(null);
    }
  };

  const fmtWib = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(d);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`nb-panel border-[3px] p-4 font-bold text-ink ${
            feedback.kind === "success" ? "bg-accent" : "bg-orange"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Status Anti-Cheating Banner */}
      {!antiCheatingEnabled && (
        <div role="note" className="nb-panel border-[3px] bg-amber-500/20 p-4 text-ink flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={24} aria-hidden="true" />
            <div>
              <p className="font-bold">Anti-Cheating Saat Ini Dinonaktifkan</p>
              <p className="text-sm text-ink/80">
                Aktifkan di tab Editor Form &gt; Pengaturan &gt; Keamanan & Anti-Cheating agar sistem mulai mengawasi peserta baru.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="nb-panel p-4 bg-surface border-2 border-line">
          <p className="nb-mono text-xs text-ink/70 uppercase">Total Sesi Ujian</p>
          <p className="font-display text-3xl font-bold mt-1">{totalSessions}</p>
        </div>
        <div className="nb-panel p-4 bg-surface border-2 border-line">
          <p className="nb-mono text-xs text-cobalt uppercase">Sedang Berlangsung</p>
          <p className="font-display text-3xl font-bold mt-1 text-cobalt">{inProgressSessions}</p>
        </div>
        <div className="nb-panel p-4 bg-surface border-2 border-line">
          <p className="nb-mono text-xs text-amber-600 uppercase">Menerima Peringatan</p>
          <p className="font-display text-3xl font-bold mt-1 text-amber-600">{warnedSessions}</p>
        </div>
        <div className="nb-panel p-4 bg-surface border-2 border-line">
          <p className="nb-mono text-xs text-[#c62f00] uppercase">Diblokir Otomatis</p>
          <p className="font-display text-3xl font-bold mt-1 text-[#c62f00]">{blockedSessions}</p>
        </div>
      </div>

      {/* Filter and Refresh Bar */}
      <div className="nb-panel p-3 flex flex-wrap items-center justify-between gap-3 bg-paper/40">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${filter === "all" ? "nb-btn-ink" : "nb-btn-ghost"}`}
          >
            Semua ({totalSessions})
          </button>
          <button
            type="button"
            onClick={() => setFilter("in_progress")}
            className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${filter === "in_progress" ? "nb-btn-ink" : "nb-btn-ghost"}`}
          >
            Berlangsung ({inProgressSessions})
          </button>
          <button
            type="button"
            onClick={() => setFilter("blocked")}
            className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${filter === "blocked" ? "nb-btn-ink" : "nb-btn-ghost"}`}
          >
            Diblokir ({blockedSessions})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`nb-btn min-h-9 px-3 py-1.5 text-xs ${filter === "completed" ? "nb-btn-ink" : "nb-btn-ghost"}`}
          >
            Selesai ({sessions.filter((s) => s.status === "completed").length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="nb-btn nb-btn-ghost min-h-9 px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} aria-hidden="true" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Sesi & Pelanggaran List */}
      {filteredSessions.length === 0 ? (
        <div className="nb-panel p-10 text-center text-ink/70">
          <ShieldCheck size={40} className="mx-auto mb-3 text-ink/40" aria-hidden="true" />
          <p className="font-display text-lg font-bold">Belum ada sesi pengawasan</p>
          <p className="text-sm mt-1">
            Ketika peserta mulai mengerjakan formulir yang mengaktifkan Anti-Cheating, aktivitas sesi akan muncul di sini secara real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const respondentTitle =
              session.respondentName ||
              session.respondentEmail ||
              `Peserta Anonim (${session.sessionKey.slice(0, 8)})`;

            // Badge styling
            let statusBadge = (
              <span className="nb-mono text-xs px-2 py-0.5 border border-line bg-cobalt/20 text-cobalt font-bold">
                Berlangsung
              </span>
            );
            if (session.status === "completed") {
              statusBadge = (
                <span className="nb-mono text-xs px-2 py-0.5 border border-line bg-lime/30 text-ink font-bold">
                  Selesai
                </span>
              );
            } else if (session.status === "blocked") {
              statusBadge = (
                <span className="nb-mono text-xs px-2 py-0.5 border border-line bg-[#c62f00] text-white font-bold">
                  Diblokir 3/3
                </span>
              );
            }

            // Violation count styling
            let countBadgeClass = "bg-surface text-ink";
            if (session.violationCount === 1) countBadgeClass = "bg-amber-300 text-ink font-bold";
            else if (session.violationCount === 2) countBadgeClass = "bg-orange text-ink font-bold";
            else if (session.violationCount >= 3) countBadgeClass = "bg-[#c62f00] text-white font-bold";

            return (
              <div
                key={session.id}
                className={`nb-panel border-2 border-line transition-all ${
                  session.status === "blocked" ? "border-[#c62f00]" : ""
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="p-1 hover:bg-paper/80 rounded"
                      aria-label={isExpanded ? "Tutup detail" : "Buka detail log"}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base truncate">{respondentTitle}</span>
                        {statusBadge}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink/70 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" /> Mulai: {fmtWib(session.startedAt)}
                        </span>
                        {session.lastViolationAt && (
                          <span className="text-amber-700 dark:text-amber-400">
                            Pelanggaran Terakhir: {fmtWib(session.lastViolationAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`nb-mono text-xs px-2.5 py-1 border-2 border-line rounded ${countBadgeClass}`}
                      title={`${session.violationCount} dari ${session.maxViolations} pelanggaran`}
                    >
                      Pelanggaran: {session.violationCount}/{session.maxViolations}
                    </div>

                    {session.status === "blocked" && (
                      <button
                        type="button"
                        onClick={() => handleUnblock(session.id)}
                        disabled={unblockingId === session.id}
                        className="nb-btn nb-btn-ghost min-h-8 px-2.5 py-1 text-xs flex items-center gap-1.5"
                      >
                        <Unlock size={14} aria-hidden="true" />
                        <span>{unblockingId === session.id ? "Membuka…" : "Buka Blokir"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Detail Logs */}
                {isExpanded && (
                  <div className="border-t-2 border-line p-4 bg-paper/40 space-y-3">
                    <p className="nb-mono text-xs uppercase tracking-wider font-bold">
                      Riwayat Log Pelanggaran Sesi Ini:
                    </p>

                    {session.logs.length === 0 ? (
                      <p className="text-xs text-ink/70 italic">Tidak ada catatan pelanggaran pada sesi ini (bersih).</p>
                    ) : (
                      <div className="space-y-2">
                        {session.logs.map((log) => (
                          <div
                            key={log.id}
                            className="nb-panel p-3 bg-surface border border-line text-xs flex flex-wrap items-start justify-between gap-2"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-700 dark:text-amber-400">
                                  Pelanggaran #{log.violationNumber}
                                </span>
                                <span className="nb-mono border border-line px-1.5 py-0.5 bg-paper/80">
                                  {VIOLATION_LABELS[log.violationType] || log.violationType}
                                </span>
                              </div>
                              <p className="font-medium text-ink">{log.message}</p>
                            </div>
                            <span className="nb-mono text-ink/60 shrink-0">{fmtWib(log.occurredAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Technical session info */}
                    <div className="pt-2 border-t border-line/30 flex flex-wrap items-center justify-between text-xs text-ink/60">
                      <span>Sesi ID: {session.sessionKey}</span>
                      {Array.isArray(session.metadata?.unblock_history) && (
                        <span className="text-green-700 dark:text-green-400 font-bold">
                          ✓ Pernah dibuka blokir ({session.metadata.unblock_history.length} kali)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

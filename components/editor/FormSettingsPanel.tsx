"use client";

import type { FormSettings, ProctoringSettings } from "@/lib/forms/schema";
import { DEFAULT_PROCTORING_SETTINGS } from "@/lib/forms/schema";
import { ShieldAlert, ShieldCheck, AlertTriangle, Monitor, EyeOff, CopySlash } from "lucide-react";

type Props = { settings: FormSettings; onChange: (patch: Partial<FormSettings>) => void };

const legend = "mb-2 block font-display font-bold";
const hint = "mt-1 text-sm leading-relaxed text-ink/80 dark:text-ink/70";
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";

export function FormSettingsPanel({ settings, onChange }: Props) {
  const proctoring = settings.proctoring ?? DEFAULT_PROCTORING_SETTINGS;

  const updateProctoring = (patch: Partial<ProctoringSettings>) => {
    const next: ProctoringSettings = { ...proctoring, ...patch };
    onChange({
      proctoring: next,
      allowTabSwitch: !next.enabled, // sync kompatibilitas mundur
    });
  };

  return (
    <div className="nb-panel nb-panel-strong space-y-6 p-4">
      <p className="nb-mono">Pengaturan form</p>

      {/* Mode Kuis */}
      <fieldset>
        <legend className={legend}>Jenis form</legend>
        <label className={choice}>
          <input
            type="radio"
            name="s-mode"
            className={box}
            checked={!settings.quiz}
            onChange={() => onChange({ quiz: false })}
          />
          Form biasa
        </label>
        <label className={choice}>
          <input
            type="radio"
            name="s-mode"
            className={box}
            checked={settings.quiz}
            onChange={() => onChange({ quiz: true })}
          />
          Kuis (dinilai otomatis)
        </label>
        <p className={hint}>
          Mode kuis menambahkan &quot;Kunci jawaban&quot; di pengaturan tiap soal. Setelah mengirim, responden langsung melihat skor.
        </p>
      </fieldset>

      {/* Batasi 1 respons per akun */}
      <div>
        <label className={choice}>
          <input
            type="checkbox"
            className={box}
            checked={settings.oneResponsePerAccount}
            onChange={(e) => onChange({ oneResponsePerAccount: e.target.checked })}
          />
          <span className="font-bold">Batasi 1 respons per akun</span>
        </label>
        <p className={hint}>
          Responden wajib masuk dengan akun. Akun yang sama tidak bisa mengisi lagi.
        </p>
      </div>

      <hr className="border-t-2 border-line/40 my-4" />

      {/* Keamanan & Anti-Cheating System */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {proctoring.enabled ? (
            <ShieldAlert className="text-orange shrink-0" size={20} aria-hidden="true" />
          ) : (
            <ShieldCheck className="text-line shrink-0" size={20} aria-hidden="true" />
          )}
          <span className="font-display font-bold text-lg">Keamanan & Anti-Cheating</span>
        </div>

        {/* Sakelar Utama */}
        <div className="nb-panel p-3 bg-surface border-2 border-line">
          <label className={choice}>
            <input
              type="checkbox"
              className={box}
              checked={proctoring.enabled}
              onChange={(e) => updateProctoring({ enabled: e.target.checked })}
            />
            <span className="font-bold">Aktifkan Anti-Cheating & Tab Lock</span>
          </label>
          <p className={hint}>
            Sistem memantau aktivitas pengerjaan peserta, menampilkan peringatan bertahap, mencatat pelanggaran di audit log, dan otomatis mendiskualifikasi/memblokir peserta setelah batas pelanggaran tercapai.
          </p>
        </div>

        {proctoring.enabled && (
          <div className="space-y-4 pl-1 sm:pl-2 animate-in fade-in duration-200">
            {/* Opsi Tab Lock & Focus Protection */}
            <div className="space-y-2 border-l-3 border-line pl-3">
              <p className="nb-mono text-xs uppercase tracking-wider font-bold">Opsi Pengawasan Browser</p>

              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.detectTabSwitch}
                  onChange={(e) => updateProctoring({ detectTabSwitch: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Deteksi Perpindahan Tab (Tab Switching)</span>
                  <p className="text-xs text-ink/70">Mencatat ketika peserta beralih ke tab browser lain (Page Visibility API).</p>
                </div>
              </label>

              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.detectWindowBlur}
                  onChange={(e) => updateProctoring({ detectWindowBlur: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Deteksi Kehilangan Fokus Jendela (Window Blur)</span>
                  <p className="text-xs text-ink/70">Mencatat ketika jendela browser kehilangan fokus aktif (misal alt-tab atau klik aplikasi lain).</p>
                </div>
              </label>

              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.requireFullscreen}
                  onChange={(e) => updateProctoring({ requireFullscreen: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Wajibkan Mode Layar Penuh (Require Fullscreen)</span>
                  <p className="text-xs text-ink/70">Peserta diminta masuk layar penuh sebelum memulai ujian dan dicatat jika keluar.</p>
                </div>
              </label>

              {proctoring.requireFullscreen && (
                <label className="flex items-start gap-3 py-1 pl-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className={box}
                    checked={proctoring.detectFullscreenExit}
                    onChange={(e) => updateProctoring({ detectFullscreenExit: e.target.checked })}
                  />
                  <div>
                    <span className="font-semibold text-sm">Deteksi Keluar Layar Penuh (Fullscreen Exit)</span>
                    <p className="text-xs text-ink/70">Mencatat pelanggaran saat peserta menekan Esc atau keluar dari fullscreen.</p>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.detectNavigation}
                  onChange={(e) => updateProctoring({ detectNavigation: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Deteksi Navigasi Keluar (Page Leave / Refresh)</span>
                  <p className="text-xs text-ink/70">Memunculkan dialog konfirmasi bawaan saat peserta mencoba menutup atau memuat ulang halaman.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.restrictCopyPaste}
                  onChange={(e) => updateProctoring({ restrictCopyPaste: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Batasi Salin-Tempel (Restrict Copy & Paste)</span>
                  <p className="text-xs text-ink/70">Mencegah aksi copy, cut, paste, dan klik kanan pada area ujian.</p>
                </div>
              </label>
            </div>

            {/* Batas Pelanggaran */}
            <div className="border-l-3 border-line pl-3 pt-1">
              <label htmlFor="max-violations-input" className="block font-semibold text-sm mb-1">
                Batas Maksimal Pelanggaran (Diskualifikasi Otomatis)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="max-violations-input"
                  type="number"
                  min={1}
                  max={10}
                  className="nb-input w-24 py-1.5 px-3 font-mono font-bold text-center"
                  value={proctoring.maxViolations}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 10) {
                      updateProctoring({ maxViolations: val });
                    }
                  }}
                />
                <span className="text-sm text-ink/70">kali pelanggaran (default: 3 kali)</span>
              </div>
              <p className={hint}>
                Peserta otomatis dikeluarkan dan diblokir dari pengerjaan pada pelanggaran ke-{proctoring.maxViolations}.
              </p>
            </div>

            {/* Notifikasi ke Pembuat Form */}
            <div className="border-l-3 border-line pl-3 pt-1">
              <label className="flex items-start gap-3 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className={box}
                  checked={proctoring.notifyOwnerOnViolation}
                  onChange={(e) => updateProctoring({ notifyOwnerOnViolation: e.target.checked })}
                />
                <div>
                  <span className="font-semibold text-sm">Kirim Notifikasi Real-Time ke Pemilik</span>
                  <p className="text-xs text-ink/70">Menerima pemberitahuan langsung di Notification Center saat peserta melanggar aturan ujian.</p>
                </div>
              </label>
            </div>

            {/* Keterbatasan & Batasan Browser */}
            <div className="nb-panel p-3 bg-amber-500/10 border-2 border-line text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} aria-hidden="true" />
                <span>Keterbatasan Deteksi Browser</span>
              </div>
              <p className="leading-relaxed text-ink/80 dark:text-ink/70">
                Deteksi mengandalkan event browser (tab visibility, window blur, fullscreen API). Sistem tidak dapat mendeteksi penggunaan perangkat sekunder (ponsel/laptop lain) atau memantau aplikasi eksternal secara fisik di luar lingkungan browser.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

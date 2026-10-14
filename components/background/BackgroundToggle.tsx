"use client";

import { Pause, Sparkles } from "lucide-react";
import { useBackground } from "./BackgroundProvider";

/**
 * Kontrol mode background.
 *  - variant="icon": tombol 44px bergaya lonceng notifikasi (untuk header).
 *  - variant="full": pilihan Gerak/Diam berlabel (untuk halaman Akun).
 */
export function BackgroundToggle({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { pref, effective, reducedMotion, setPref } = useBackground();
  const locked = reducedMotion;
  const lockedNote = "Dimatikan oleh pengaturan sistem (kurangi gerakan).";

  if (variant === "icon") {
    const moving = effective === "gerak";
    const label = locked ? `Animasi latar: diam. ${lockedNote}` : moving ? "Animasi latar: gerak. Ketuk untuk diam." : "Animasi latar: diam. Ketuk untuk gerak.";
    return (
      <button
        type="button"
        onClick={() => setPref(pref === "gerak" ? "diam" : "gerak")}
        disabled={locked}
        aria-label={label}
        aria-pressed={moving}
        title={label}
        className="nb-bell-btn disabled:cursor-not-allowed disabled:opacity-60"
      >
        {moving ? <Sparkles className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" /> : <Pause className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />}
      </button>
    );
  }

  const options: { value: "gerak" | "diam"; label: string; hint: string }[] = [
    { value: "gerak", label: "Gerak", hint: "Latar bergerak halus" },
    { value: "diam", label: "Diam", hint: "Latar statis, tanpa animasi" },
  ];
  return (
    <div>
      <div role="radiogroup" aria-label="Animasi latar" className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const selected = effective === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked && o.value === "gerak"}
              onClick={() => setPref(o.value)}
              className={`nb-btn flex-col items-start gap-1 text-left ${selected ? "" : "nb-btn-ghost"}`}
            >
              <span>{o.label}</span>
              <span className="nb-mono normal-case tracking-normal opacity-80">{o.hint}</span>
            </button>
          );
        })}
      </div>
      {locked && <p className="nb-mono mt-3 normal-case tracking-normal">{lockedNote}</p>}
    </div>
  );
}

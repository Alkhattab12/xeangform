"use client";

import React from "react";
import { Sparkles, CircleOff } from "lucide-react";
import { useBackground } from "./BackgroundContext";

export function BackgroundToggle({
  showLabel = false,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { mode, toggleMode, isMounted } = useBackground();

  // Sebelum mount, render placeholder yang stabil untuk menghindari hydration mismatch
  if (!isMounted) {
    return (
      <button
        type="button"
        disabled
        className={`nb-btn nb-btn-ghost text-xs py-1.5 px-2.5 min-h-[38px] opacity-70 ${className}`}
        aria-label="Memuat preferensi background"
      >
        <Sparkles className="h-4 w-4" />
        {showLabel && <span className="ml-1.5">Mode Gerak</span>}
      </button>
    );
  }

  const isMotion = mode === "motion";

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`nb-btn nb-btn-ghost text-xs py-1.5 px-2.5 min-h-[38px] flex items-center gap-1.5 transition-colors ${
        isMotion ? "border-cobalt hover:border-line" : "border-line"
      } ${className}`}
      title={isMotion ? "Mode Gerak: Animasi background aktif (Klik untuk Mode Diam)" : "Mode Diam: Background statis (Klik untuk Mode Gerak)"}
      aria-label={isMotion ? "Ubah ke Mode Diam (Animasi Statis)" : "Ubah ke Mode Gerak (Animasi Halus)"}
    >
      {isMotion ? (
        <>
          <Sparkles className="h-4 w-4 text-cobalt shrink-0" />
          {showLabel && <span className="font-display font-bold">Mode Gerak</span>}
        </>
      ) : (
        <>
          <CircleOff className="h-4 w-4 text-ink/70 shrink-0" />
          {showLabel && <span className="font-display font-bold">Mode Diam</span>}
        </>
      )}
    </button>
  );
}

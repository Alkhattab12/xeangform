"use client";

import React, { useEffect, useRef } from "react";
import { useBackground } from "./BackgroundContext";

export function GlobalBackground() {
  const { mode, isMounted } = useBackground();
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Hanya pasang event pointer jika mode gerak aktif di client
    if (!isMounted || mode !== "motion") {
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = "0";
      }
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isMoving = false;

    const handlePointerMove = (e: PointerEvent) => {
      // Abaikan jika layar sentuh / hover tidak didukung
      if (e.pointerType === "touch") return;

      targetX = e.clientX;
      targetY = e.clientY;

      if (!isMoving) {
        isMoving = true;
        renderSpotlight();
      }
    };

    const renderSpotlight = () => {
      // Lerp halus agar respons cahaya sangat lembut
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${currentX - 180}px, ${currentY - 180}px, 0)`;
        spotlightRef.current.style.opacity = "0.45";
      }

      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
        rafRef.current = requestAnimationFrame(renderSpotlight);
      } else {
        isMoving = false;
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [mode, isMounted]);

  return (
    <div
      aria-hidden="true"
      className="bg-mesh-container select-none pointer-events-none"
    >
      {/* Pola titik tekstur Neo-Brutalist yang konsisten */}
      <div className="bg-dot-pattern" />

      {/* Aura warna bergerak (otomatis dihentikan jika mode diam) */}
      <div className="bg-orb-cobalt" />
      <div className="bg-orb-accent" />

      {/* Cahaya sorot interaktif saat kursor digerakkan (khusus mode gerak) */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute left-0 top-0 h-[360px] w-[360px] rounded-full opacity-0 transition-opacity duration-300 blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--lime) 25%, transparent) 0%, color-mix(in srgb, var(--cobalt) 12%, transparent) 40%, transparent 70%)",
        }}
      />
    </div>
  );
}

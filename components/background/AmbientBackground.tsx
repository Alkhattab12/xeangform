"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBackground } from "./BackgroundProvider";

/**
 * Lapisan background global (dipasang SATU kali di layout root, jadi tidak bertumpuk saat berpindah rute).
 * - Gerak: blob warna merek melayang pelan (CSS transform saja, tanpa loop JavaScript) + cahaya yang mengikuti pointer.
 * - Diam : komposisi yang sama, statis. Tidak ada animasi CSS dan tidak ada listener pointer yang berjalan.
 * Halaman form publik (/f/...) punya tema sendiri, jadi tidak diberi background ini.
 */
export function AmbientBackground() {
  const pathname = usePathname();
  const { effective } = useBackground();
  const glowRef = useRef<HTMLSpanElement>(null);
  const hidden = pathname.startsWith("/f/");
  const moving = effective === "gerak" && !hidden;

  // Cahaya mengikuti pointer: hanya di mode gerak, perangkat dengan pointer halus (bukan layar sentuh), dan dibatasi 1x per frame
  useEffect(() => {
    if (!moving) return;
    const el = glowRef.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = "1";
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
      el.style.opacity = "0";
    };
  }, [moving]);

  if (hidden) return null;
  return (
    <div className="xf-bg" aria-hidden="true">
      <span className="xf-bg-blob xf-bg-blob-a" />
      <span className="xf-bg-blob xf-bg-blob-b" />
      <span className="xf-bg-blob xf-bg-blob-c" />
      <span className="xf-bg-blob xf-bg-blob-d" />
      <span className="xf-bg-grid" />
      {moving && <span ref={glowRef} className="xf-bg-glow" />}
    </div>
  );
}

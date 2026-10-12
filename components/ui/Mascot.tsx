"use client";

import { useEffect, useState } from "react";

export type PuckState = "idle" | "typing" | "thinking" | "working" | "success" | "error";

// Sprite sheet: public/puck/puck-sprite.png (latar transparan, 8 kolom x 6 baris, 172x132 px per frame).
// Urutan baris: idle, typing, thinking, working, success, error. Metadata ada di puck-atlas.json.
const FRAME_W = 172;
const FRAME_H = 132;
const COLS = 8;
const ROW: Record<PuckState, number> = { idle: 0, typing: 1, thinking: 2, working: 3, success: 4, error: 5 };
const FPS: Record<PuckState, number> = { idle: 6, typing: 10, thinking: 5, working: 14, success: 10, error: 9 };
const LABEL: Record<PuckState, string> = {
  idle: "Siap membantu…",
  typing: "Sedang mengetik…",
  thinking: "Hmm, lagi mikir…",
  working: "Lagi ngebut…",
  success: "Beres!",
  error: "Waduh, ada yang bingung…",
};

// Urutan otomatis saat overlay loading tampil (state tidak diisi).
const AUTO: { state: PuckState; ms: number }[] = [
  { state: "typing", ms: 2400 },
  { state: "thinking", ms: 1800 },
  { state: "working", ms: 2400 },
];

// Opsional: gambar maskot sendiri (milikmu atau berlisensi) lewat NEXT_PUBLIC_LOADER_MASCOT_URL.
const RAW = process.env.NEXT_PUBLIC_LOADER_MASCOT_URL;
const CUSTOM = RAW && /^(https?:\/\/|\/)/.test(RAW) ? RAW : null;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

type Props = {
  /** Paksa satu status. Jika kosong, Puck bergantian: mengetik → berpikir → bekerja. */
  state?: PuckState;
  /** Pembesaran bilangan bulat agar piksel tetap tajam (default 1). */
  scale?: number;
  /** Tampilkan teks keterangan di bawah sprite (default true). */
  caption?: boolean;
};

export function Mascot({ state, scale = 1, caption = true }: Props) {
  const reduced = usePrefersReducedMotion();
  const [autoIdx, setAutoIdx] = useState(0);
  const [frame, setFrame] = useState(0);

  const current: PuckState = state ?? AUTO[autoIdx].state;

  // Ganti status otomatis (hanya jika state tidak dipaksa dan gerak tidak dikurangi).
  useEffect(() => {
    if (state || reduced) return;
    const t = setTimeout(() => setAutoIdx((i) => (i + 1) % AUTO.length), AUTO[autoIdx].ms);
    return () => clearTimeout(t);
  }, [state, reduced, autoIdx]);

  // Putar frame untuk status aktif.
  useEffect(() => {
    setFrame(0);
    if (reduced || CUSTOM) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % COLS), 1000 / FPS[current]);
    return () => clearInterval(t);
  }, [current, reduced]);

  const w = FRAME_W * scale;
  const h = FRAME_H * scale;
  const layer = (src: string): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundImage: `url(${src})`,
    backgroundSize: `${COLS * w}px ${6 * h}px`,
    backgroundPosition: `${-frame * w}px ${-ROW[current] * h}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {CUSTOM ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={CUSTOM} alt="" className="m-bob h-28 w-28 object-contain" />
      ) : (
        <div style={{ position: "relative", width: w, height: h }} aria-hidden="true">
          <div style={layer("/puck/puck-sprite.png")} />
        </div>
      )}
      {caption && (
        <>
          <p className="font-display text-lg font-bold" aria-hidden="true">
            {LABEL[current]}
          </p>
          <p className="nb-mono">Mohon tunggu sebentar</p>
        </>
      )}
    </div>
  );
}

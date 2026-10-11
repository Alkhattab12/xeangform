"use client";

import { useEffect, useState } from "react";

// Opsional: gambar maskot sendiri (milikmu atau berlisensi) lewat NEXT_PUBLIC_LOADER_MASCOT_URL.
const RAW = process.env.NEXT_PUBLIC_LOADER_MASCOT_URL;
const CUSTOM = RAW && /^(https?:\/\/|\/)/.test(RAW) ? RAW : null;

/** "Blobi": maskot orisinal yang mengetik lalu berpikir selama proses berjalan. */
export function Mascot() {
  const [phase, setPhase] = useState<"typing" | "thinking">("typing");
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p === "typing" ? "thinking" : "typing")), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {CUSTOM ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={CUSTOM} alt="" className="m-bob h-28 w-28 object-contain" />
      ) : (
        <svg viewBox="0 0 160 130" className="m-anim h-28 w-36" data-phase={phase} aria-hidden="true" focusable="false">
          {/* keyboard */}
          <rect x="22" y="104" width="116" height="16" rx="3" fill="#171717" />
          <g fill="#D7FF38">
            {[30, 44, 58, 72, 86, 100, 114].map((x) => (
              <rect key={x} className="m-key" x={x} y="108" width="10" height="8" rx="1" />
            ))}
          </g>
          {/* tubuh */}
          <g className="m-head">
            <line x1="80" y1="30" x2="80" y2="14" stroke="#171717" strokeWidth="3" />
            <circle cx="80" cy="11" r="5.5" fill="#FF6B35" stroke="#171717" strokeWidth="2.5" />
            <ellipse cx="80" cy="66" rx="38" ry="34" fill="#3457FF" stroke="#171717" strokeWidth="3.5" />
            <ellipse cx="66" cy="50" rx="8" ry="5" fill="#fff" opacity="0.35" />
            <circle cx="66" cy="62" r="9" fill="#fff" stroke="#171717" strokeWidth="2.5" />
            <circle className="m-pupil" cx="66" cy="63" r="4" fill="#171717" />
            <circle cx="94" cy="62" r="9" fill="#fff" stroke="#171717" strokeWidth="2.5" />
            <circle className="m-pupil" cx="94" cy="63" r="4" fill="#171717" />
            <path d="M72 80 Q80 87 88 80" stroke="#171717" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          {/* lengan */}
          <path className="m-arm-l" d="M50 80 Q42 92 56 102" stroke="#171717" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path className="m-arm-r" d="M110 80 Q118 92 104 102" stroke="#171717" strokeWidth="7" fill="none" strokeLinecap="round" />
          {/* gelembung berpikir */}
          <g className="m-bubble">
            <circle cx="122" cy="34" r="3" fill="#fff" stroke="#171717" strokeWidth="2" />
            <ellipse cx="136" cy="18" rx="19" ry="11" fill="#fff" stroke="#171717" strokeWidth="2.5" />
            <g fill="#171717">
              <circle className="m-dot" cx="128" cy="18" r="2.4" />
              <circle className="m-dot" cx="136" cy="18" r="2.4" />
              <circle className="m-dot" cx="144" cy="18" r="2.4" />
            </g>
          </g>
        </svg>
      )}
      <p className="font-display text-lg font-bold" aria-hidden="true">
        {phase === "typing" ? "Sedang mengetik…" : "Hmm, lagi mikir…"}
      </p>
      <p className="nb-mono">Mohon tunggu sebentar</p>
    </div>
  );
}

import type { ReactNode } from "react";
import type { PieLabelRenderProps } from "recharts";

const RAD = Math.PI / 180;

/**
 * Label angka di DALAM irisan/cincin (bukan di luar). Posisi: tengah ketebalan cincin pada sudut tengah irisan.
 * Teks memakai garis tepi warna permukaan (paint-order: stroke) agar terbaca di atas warna irisan apa pun, terang maupun gelap.
 * Irisan yang terlalu sempit (< minShare dari total) tidak diberi label supaya tidak bertabrakan; angkanya tetap ada di daftar bawah grafik.
 */
export function insideLabelRenderer<T>(text: (payload: T) => string | null, opts: { minShare?: number; fontSize?: number } = {}) {
  const { minShare = 0.06, fontSize = 12 } = opts;
  return function InsideLabel(p: PieLabelRenderProps): ReactNode {
    const cx = Number(p.cx);
    const cy = Number(p.cy);
    const inner = Number(p.innerRadius) || 0;
    const outer = Number(p.outerRadius);
    // Irisan penuh (100%): sudut tengahnya jatuh di tepi kiri cincin, tempat ruang paling sempit. Pindahkan ke atas.
    const mid = p.percent && p.percent >= 0.999 ? 90 : Number(p.midAngle);
    if (![cx, cy, outer, mid].every(Number.isFinite) || !p.percent || p.percent < minShare) return null;
    const label = text(p.payload as T);
    if (!label) return null;
    // Donat: tengah cincin. Lingkaran penuh: 62% dari jari-jari (lebih dekat ke tepi agar tidak menumpuk di pusat).
    const r = inner > 0 ? inner + (outer - inner) / 2 : outer * 0.62;
    return (
      <text
        x={cx + r * Math.cos(-mid * RAD)}
        y={cy + r * Math.sin(-mid * RAD)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--fg)"
        stroke="var(--surface)"
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
        fontSize={fontSize}
        fontWeight={800}
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    );
  };
}

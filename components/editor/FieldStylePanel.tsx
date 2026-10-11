"use client";

import { useId } from "react";
import { FONT_KEYS, type FieldStyle } from "@/lib/forms/schema";
import { FONT_LABEL, contrast } from "@/lib/forms/theme";

type Props = { style?: FieldStyle; onChange: (s: FieldStyle | undefined) => void };

const lbl = "text-sm font-bold";
const mini = "nb-btn nb-btn-ghost min-h-10 px-2 py-1 text-xs";

function ColorRow({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string | undefined) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={`flex-1 ${lbl}`}>{label}</label>
      <input id={id} type="color" value={value ?? fallback} onChange={(e) => onChange(e.target.value.toLowerCase())} className="h-10 w-12 cursor-pointer border-2 border-line bg-surface p-0" />
      <button type="button" onClick={() => onChange(undefined)} disabled={!value} className={mini}>Bawaan</button>
    </div>
  );
}

function RangeRow({ label, value, min, max, onChange }: { label: string; value?: number; min: number; max: number; onChange: (v: number | undefined) => void }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={lbl}>{label}: {value === undefined ? "bawaan" : `${value}px`}</label>
        <button type="button" onClick={() => onChange(undefined)} disabled={value === undefined} className={mini}>Bawaan</button>
      </div>
      <input id={id} type="range" min={min} max={max} step={1} value={value ?? min} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 h-8 w-full accent-[#3457ff]" />
    </div>
  );
}

/** Gaya visual untuk SATU soal (menimpa tema form). Hanya nilai terbatas, bukan CSS bebas. */
export function FieldStylePanel({ style, onChange }: Props) {
  const s: FieldStyle = style ?? {};
  const fontId = useId();
  const sizeId = useId();

  const set = (patch: Partial<FieldStyle>) => {
    const next = { ...s, ...patch } as Record<string, unknown>;
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    onChange(Object.keys(next).length ? (next as FieldStyle) : undefined);
  };

  const lowContrast = s.bg && s.fg ? contrast(s.bg, s.fg) < 4.5 : false;

  return (
    <div className="space-y-4">
      <ColorRow label="Warna kartu" value={s.bg} fallback="#ffffff" onChange={(v) => set({ bg: v })} />
      <ColorRow label="Warna teks" value={s.fg} fallback="#171717" onChange={(v) => set({ fg: v })} />
      <ColorRow label="Warna garis" value={s.line} fallback="#171717" onChange={(v) => set({ line: v })} />
      {lowContrast && (
        <p role="alert" className="border-2 border-line bg-orange p-2 text-sm font-bold text-ink">
          Kontras teks dan kartu rendah (di bawah 4,5:1). Teks bisa sulit dibaca.
        </p>
      )}
      <RangeRow label="Sudut membulat" value={s.radius} min={0} max={32} onChange={(v) => set({ radius: v })} />
      <RangeRow label="Bayangan" value={s.shadow} min={0} max={12} onChange={(v) => set({ shadow: v })} />
      <div>
        <label htmlFor={fontId} className={`mb-1 block ${lbl}`}>Huruf</label>
        <select id={fontId} className="nb-input" value={s.font ?? ""} onChange={(e) => set({ font: (e.target.value || undefined) as FieldStyle["font"] })}>
          <option value="">Ikuti tema</option>
          {FONT_KEYS.map((k) => (<option key={k} value={k}>{FONT_LABEL[k]}</option>))}
        </select>
      </div>
      <div>
        <label htmlFor={sizeId} className={`mb-1 block ${lbl}`}>Ukuran judul soal</label>
        <select id={sizeId} className="nb-input" value={s.labelSize ?? ""} onChange={(e) => set({ labelSize: (e.target.value || undefined) as FieldStyle["labelSize"] })}>
          <option value="">Sedang (bawaan)</option>
          <option value="sm">Kecil</option>
          <option value="lg">Besar</option>
        </select>
      </div>
      <button type="button" onClick={() => onChange(undefined)} disabled={!style} className={mini}>Reset gaya soal ini</button>
    </div>
  );
}

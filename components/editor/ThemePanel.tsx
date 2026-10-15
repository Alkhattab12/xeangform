"use client";

import { useId } from "react";
import { useBackground } from "@/components/background/BackgroundProvider";
import { DynamicDecor } from "@/components/public/DynamicDecor";
import { DECOR_KEYS, FONT_KEYS, THEME_PRESETS, type DecorKey, type FormTheme } from "@/lib/forms/schema";
import { FONT_LABEL, PRESETS, contrast, resolveTheme, themeStyle } from "@/lib/forms/theme";

type Props = { theme: FormTheme | null; onChange: (t: FormTheme | null) => void };

const DECOR_LABEL: Record<DecorKey, string> = {
  none: "Tanpa", dots: "Titik", grid: "Kisi", stars: "Bintang", shapes: "Bentuk", strata: "Lapisan", cells: "Sel", bubbles: "Gelembung",
};
const lbl = "text-sm font-bold";
const mini = "nb-btn nb-btn-ghost min-h-10 px-2 py-1 text-xs";

function ColorRow({ label, value, shown, onChange }: { label: string; value?: string; shown: string; onChange: (v: string | undefined) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={`flex-1 ${lbl}`}>{label}</label>
      <input id={id} type="color" value={shown} onChange={(e) => onChange(e.target.value.toLowerCase())} className="h-10 w-12 cursor-pointer border-2 border-line bg-surface p-0" />
      <button type="button" onClick={() => onChange(undefined)} disabled={!value} className={mini}>Bawaan</button>
    </div>
  );
}

function RangeRow({ label, value, shown, min, max, onChange }: { label: string; value?: number; shown: number; min: number; max: number; onChange: (v: number | undefined) => void }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={lbl}>{label}: {shown}px</label>
        <button type="button" onClick={() => onChange(undefined)} disabled={value === undefined} className={mini}>Bawaan</button>
      </div>
      <input id={id} type="range" min={min} max={max} step={1} value={shown} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 h-8 w-full accent-[#3457ff]" />
    </div>
  );
}

/** Pemilih 10 preset tema + kustomisasi warna, bentuk, huruf, dan dekorasi. Tema berlaku di form publik. */
export function ThemePanel({ theme, onChange }: Props) {
  const fontId = useId();
  const decorId = useId();
  const r = theme ? resolveTheme(theme) : null;
  const { effective } = useBackground();
  const dynamicOn = r?.motion === "dinamis";

  const set = (patch: Partial<FormTheme>) => {
    if (!theme) return;
    const next = { ...theme, ...patch } as Record<string, unknown>;
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    onChange(next as unknown as FormTheme);
  };

  const warnBg = r ? contrast(r.fg, r.bg) < 4.5 : false;
  const warnSurface = r ? contrast(r.fg, r.surface) < 4.5 : false;

  return (
    <div className="nb-panel nb-panel-strong space-y-5 p-4">
      <div>
        <p className="nb-mono">Tema form</p>
        <p className="mt-1 text-sm leading-relaxed">Berlaku di halaman publik dan pratinjau kanvas. Setiap soal masih bisa diberi gaya sendiri.</p>
      </div>

      <div role="group" aria-label="Pilih tema" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={theme === null}
          onClick={() => onChange(null)}
          className={`nb-panel flex min-h-14 flex-col items-start justify-center gap-1 px-3 py-2 text-left ${theme === null ? "nb-shadow outline-3 outline-offset-2 outline-solid outline-cobalt" : ""}`}
        >
          <span className="font-display font-bold">Bawaan</span>
          <span className="nb-mono">Ikuti perangkat</span>
        </button>
        {THEME_PRESETS.map((k) => {
          const p = PRESETS[k];
          const active = theme?.preset === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              title={p.blurb}
              onClick={() => onChange({ preset: k, ...(theme?.motion ? { motion: theme.motion } : {}) })} /* mode dinamis ikut terbawa saat ganti tema */
              className={`nb-panel flex min-h-14 flex-col items-start justify-center gap-1 px-3 py-2 text-left ${active ? "nb-shadow outline-3 outline-offset-2 outline-solid outline-cobalt" : ""}`}
            >
              <span className="font-display font-bold">{p.name}</span>
              <span className="flex gap-1" aria-hidden="true">
                {[p.tokens.bg, p.tokens.surface, p.tokens.accent, p.tokens.fg].map((c, i) => (
                  <span key={i} className="h-4 w-4 border border-line" style={{ background: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {theme && r && (
        <>
          <div>
            <p className="nb-mono mb-2">Pratinjau</p>
            <div style={themeStyle(r)} className={`border-2 border-line p-3 ${dynamicOn ? "xf-dyn" : ""}`} data-decor={dynamicOn ? r.decor : undefined} aria-hidden="true">
              {dynamicOn && <DynamicDecor />}
              <p className="font-display text-xl font-bold">Judul form</p>
              <div className="nb-panel nb-shadow mt-2 p-3" style={{ borderRadius: "var(--radius)" }}>
                <p className="mb-2 text-sm font-bold">Contoh pertanyaan *</p>
                <div className="nb-input">Jawaban…</div>
              </div>
              <span className="nb-btn mt-3 inline-flex min-h-10 px-3 py-2 text-sm">Kirim</span>
            </div>
          </div>

          <div className="space-y-2 border-t-2 border-line pt-4">
            <p className="nb-mono">Gerakan</p>
            <button
              type="button"
              role="switch"
              aria-checked={dynamicOn}
              onClick={() => set({ motion: dynamicOn ? undefined : "dinamis" })}
              className={`nb-btn w-full justify-between ${dynamicOn ? "" : "nb-btn-ghost"}`}
            >
              <span>Mode dinamis</span>
              <span className="nb-mono">{dynamicOn ? "AKTIF" : "MATI"}</span>
            </button>
            <p className="text-sm leading-relaxed">
              Latar dan hiasan mengikuti tema ({DECOR_LABEL[r.decor]}) bergerak halus; kartu soal masuk bertahap. Responden yang memilih &quot;kurangi gerakan&quot; di perangkatnya tidak melihat animasi.
            </p>
            {dynamicOn && effective === "diam" && (
              <p role="status" className="border-2 border-line bg-lavender p-2 text-sm font-bold text-ink">
                Animasi latar di perangkatmu sedang DIAM, jadi pratinjau tidak bergerak. Ketuk tombol ✦ di header untuk menyalakannya.
              </p>
            )}
          </div>

          <div className="space-y-4 border-t-2 border-line pt-4">
            <p className="nb-mono">Kustomisasi</p>
            <ColorRow label="Latar halaman" value={theme.bg} shown={r.bg} onChange={(v) => set({ bg: v })} />
            <ColorRow label="Kartu soal" value={theme.surface} shown={r.surface} onChange={(v) => set({ surface: v })} />
            <ColorRow label="Teks" value={theme.fg} shown={r.fg} onChange={(v) => set({ fg: v })} />
            <ColorRow label="Warna aksen" value={theme.accent} shown={r.accent} onChange={(v) => set({ accent: v })} />
            {(warnBg || warnSurface) && (
              <p role="alert" className="border-2 border-line bg-orange p-2 text-sm font-bold text-ink">
                Kontras teks terhadap {warnBg && warnSurface ? "latar dan kartu" : warnBg ? "latar" : "kartu"} rendah (di bawah 4,5:1). Pilih warna yang lebih kontras.
              </p>
            )}
            <RangeRow label="Sudut membulat" value={theme.radius} shown={r.radius} min={0} max={32} onChange={(v) => set({ radius: v })} />
            <RangeRow label="Tebal garis" value={theme.border} shown={r.border} min={1} max={5} onChange={(v) => set({ border: v })} />
            <RangeRow label="Bayangan" value={theme.shadow} shown={r.shadow} min={0} max={12} onChange={(v) => set({ shadow: v })} />
            <div>
              <label htmlFor={fontId} className={`mb-1 block ${lbl}`}>Huruf</label>
              <select id={fontId} className="nb-input" value={theme.font ?? ""} onChange={(e) => set({ font: (e.target.value || undefined) as FormTheme["font"] })}>
                <option value="">Ikuti preset ({FONT_LABEL[PRESETS[theme.preset].tokens.font]})</option>
                {FONT_KEYS.map((k) => (<option key={k} value={k}>{FONT_LABEL[k]}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor={decorId} className={`mb-1 block ${lbl}`}>Dekorasi latar</label>
              <select id={decorId} className="nb-input" value={theme.decor ?? ""} onChange={(e) => set({ decor: (e.target.value || undefined) as FormTheme["decor"] })}>
                <option value="">Ikuti preset ({DECOR_LABEL[PRESETS[theme.preset].tokens.decor]})</option>
                {DECOR_KEYS.map((k) => (<option key={k} value={k}>{DECOR_LABEL[k]}</option>))}
              </select>
            </div>
            <button type="button" onClick={() => onChange({ preset: theme.preset, ...(theme.motion ? { motion: theme.motion } : {}) })} className={mini}>Reset kustomisasi</button>
          </div>
        </>
      )}
    </div>
  );
}

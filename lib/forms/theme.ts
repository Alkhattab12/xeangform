import type { CSSProperties } from "react";
import type { DecorKey, FieldStyle, FontKey, FormTheme, ThemePreset } from "./schema";

export type Tokens = {
  bg: string; surface: string; fg: string; line: string; shadowColor: string;
  accent: string; accent2: string;
  radius: number; border: number; shadow: number;
  font: FontKey; decor: DecorKey;
};
export type Resolved = Tokens & { onAccent: string; danger: string };

export const PRESETS: Record<ThemePreset, { name: string; blurb: string; tokens: Tokens }> = {
  unik: {
    name: "Unik", blurb: "Krem hangat, pink dan tosca, bentuk melengkung",
    tokens: { bg: "#FFF1D6", surface: "#FFFFFF", fg: "#1B1B1B", line: "#1B1B1B", shadowColor: "#00A88F", accent: "#FF5CAA", accent2: "#00C2A8", radius: 14, border: 3, shadow: 6, font: "grotesk", decor: "shapes" },
  },
  keren: {
    name: "Keren", blurb: "Gelap dengan neon cyan dan huruf futuristik",
    tokens: { bg: "#0B1020", surface: "#141B34", fg: "#E8ECFF", line: "#6F86FF", shadowColor: "#00E5FF", accent: "#00E5FF", accent2: "#7C4DFF", radius: 6, border: 2, shadow: 5, font: "futuristic", decor: "grid" },
  },
  abstrak: {
    name: "Abstrak", blurb: "Blok warna oranye dan biru dengan bentuk geometri",
    tokens: { bg: "#F4EFE6", surface: "#FFFFFF", fg: "#111111", line: "#111111", shadowColor: "#FF5A1F", accent: "#FF5A1F", accent2: "#3457FF", radius: 0, border: 3, shadow: 8, font: "grotesk", decor: "shapes" },
  },
  neo: {
    name: "Neo", blurb: "Neo-brutalism: garis tebal, bayangan keras, lime",
    tokens: { bg: "#F7F4EC", surface: "#FFFFFF", fg: "#171717", line: "#171717", shadowColor: "#171717", accent: "#D7FF38", accent2: "#3457FF", radius: 0, border: 2, shadow: 5, font: "grotesk", decor: "none" },
  },
  imut: {
    name: "Imut", blurb: "Pastel pink, sudut bulat, huruf bulat",
    tokens: { bg: "#FFF0F6", surface: "#FFFFFF", fg: "#5B2A46", line: "#C2548C", shadowColor: "#F4A6C8", accent: "#FFB3D1", accent2: "#B8E0FF", radius: 22, border: 2, shadow: 4, font: "rounded", decor: "bubbles" },
  },
  cooking: {
    name: "Cooking", blurb: "Krem dapur, mustard dan tomat, nuansa taplak",
    tokens: { bg: "#FFF4E0", surface: "#FFFFFF", fg: "#3B1F0F", line: "#3B1F0F", shadowColor: "#D9480F", accent: "#FFB84D", accent2: "#E8590C", radius: 10, border: 2, shadow: 5, font: "serif", decor: "dots" },
  },
  galaxy: {
    name: "Galaxy", blurb: "Ungu antariksa dengan bintang",
    tokens: { bg: "#0A0420", surface: "#1A0F3C", fg: "#F1E9FF", line: "#A78BFA", shadowColor: "#7C3AED", accent: "#C084FC", accent2: "#38BDF8", radius: 12, border: 2, shadow: 5, font: "futuristic", decor: "stars" },
  },
  kebumian: {
    name: "Kebumian", blurb: "Warna tanah, lapisan batuan, huruf serif",
    tokens: { bg: "#EFE6D8", surface: "#FAF6EE", fg: "#2E2A22", line: "#5C4B37", shadowColor: "#8A6D3B", accent: "#C2763E", accent2: "#6B8F71", radius: 4, border: 2, shadow: 5, font: "serif", decor: "strata" },
  },
  biologi: {
    name: "Biologi", blurb: "Hijau segar dengan motif sel",
    tokens: { bg: "#EAF7E4", surface: "#FFFFFF", fg: "#123524", line: "#1F5E3B", shadowColor: "#2E8B57", accent: "#7ED957", accent2: "#2BB3A3", radius: 14, border: 2, shadow: 4, font: "grotesk", decor: "cells" },
  },
  sosial: {
    name: "Sosial", blurb: "Biru tua dan amber, gelembung percakapan",
    tokens: { bg: "#EEF4FF", surface: "#FFFFFF", fg: "#14213D", line: "#14213D", shadowColor: "#FCA311", accent: "#FCA311", accent2: "#4C6FFF", radius: 8, border: 2, shadow: 5, font: "grotesk", decor: "bubbles" },
  },
};

// ---------- warna ----------
const clamp8 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function hexA(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${clamp8(r)},${clamp8(g)},${clamp8(b)},${a})`;
}
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** Warna teks (gelap/putih) dengan kontras terbaik di atas latar tertentu. */
export function onColor(bg: string): string {
  return contrast(bg, "#171717") >= contrast(bg, "#FFFFFF") ? "#171717" : "#FFFFFF";
}
const pickDanger = (surface: string) => (contrast(surface, "#C62F00") >= contrast(surface, "#FF8A65") ? "#C62F00" : "#FF8A65");

export function resolveTheme(theme: FormTheme): Resolved {
  const base = PRESETS[theme.preset].tokens;
  const t: Tokens = { ...base };
  if (theme.bg) t.bg = theme.bg;
  if (theme.surface) t.surface = theme.surface;
  if (theme.fg) {
    const followLine = base.line === base.fg;
    const followShadow = base.shadowColor === base.fg;
    t.fg = theme.fg;
    if (followLine) t.line = theme.fg;
    if (followShadow) t.shadowColor = theme.fg;
  }
  if (theme.accent) t.accent = theme.accent;
  if (theme.radius !== undefined) t.radius = theme.radius;
  if (theme.border !== undefined) t.border = theme.border;
  if (theme.shadow !== undefined) t.shadow = theme.shadow;
  if (theme.font) t.font = theme.font;
  if (theme.decor) t.decor = theme.decor;
  return { ...t, onAccent: onColor(t.accent), danger: pickDanger(t.surface) };
}

// ---------- huruf ----------
export const FONT_FAMILIES: Record<FontKey, string> = {
  grotesk: "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif",
  rounded: "var(--font-fredoka), ui-rounded, system-ui, sans-serif",
  serif: "var(--font-lora), Georgia, serif",
  futuristic: "var(--font-orbitron), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--font-plex-mono), ui-monospace, monospace",
};
/** Huruf isi: tetap mudah dibaca (Orbitron hanya untuk judul). */
export const BODY_FONT: Record<FontKey, string> = {
  grotesk: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  rounded: "var(--font-fredoka), ui-rounded, system-ui, sans-serif",
  serif: "var(--font-lora), Georgia, serif",
  futuristic: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--font-plex-mono), ui-monospace, monospace",
};
export const FONT_LABEL: Record<FontKey, string> = {
  grotesk: "Grotesk (bawaan)", rounded: "Bulat", serif: "Serif", futuristic: "Futuristik", mono: "Monospace",
};

// ---------- dekorasi latar (CSS murni, tanpa input bebas) ----------
export function decorStyle(t: Tokens): CSSProperties {
  switch (t.decor) {
    case "dots":
      return { backgroundImage: `radial-gradient(${hexA(t.line, 0.2)} 1.4px, transparent 1.6px)`, backgroundSize: "22px 22px" };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${hexA(t.line, 0.16)} 1px, transparent 1px), linear-gradient(90deg, ${hexA(t.line, 0.16)} 1px, transparent 1px)`,
        backgroundSize: "30px 30px",
      };
    case "stars":
      return {
        backgroundImage: `radial-gradient(1.5px 1.5px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 90px 120px, #fff, transparent), radial-gradient(1.8px 1.8px at 160px 60px, ${t.accent}, transparent), radial-gradient(1px 1px at 210px 190px, #fff, transparent), radial-gradient(1.4px 1.4px at 60px 200px, ${t.accent2}, transparent)`,
        backgroundSize: "260px 240px",
      };
    case "shapes":
      return {
        backgroundImage: `radial-gradient(circle at 8% 6%, ${hexA(t.accent, 0.4)} 0 110px, transparent 111px), linear-gradient(315deg, ${hexA(t.accent2, 0.28)} 0 150px, transparent 151px)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      };
    case "strata":
      return { backgroundImage: `repeating-linear-gradient(0deg, ${hexA(t.line, 0.08)} 0 14px, transparent 14px 44px)` };
    case "cells":
      return {
        backgroundImage: `radial-gradient(circle at 20% 30%, transparent 0 26px, ${hexA(t.line, 0.22)} 27px 29px, transparent 30px), radial-gradient(circle at 70% 70%, transparent 0 40px, ${hexA(t.line, 0.2)} 41px 43px, transparent 44px)`,
        backgroundSize: "260px 260px",
      };
    case "bubbles":
      return {
        backgroundImage: `radial-gradient(circle at 12% 14%, ${hexA(t.accent, 0.3)} 0 44px, transparent 45px), radial-gradient(circle at 88% 55%, ${hexA(t.accent2, 0.24)} 0 64px, transparent 65px), radial-gradient(circle at 30% 92%, ${hexA(t.line, 0.1)} 0 30px, transparent 31px)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      };
    default:
      return {};
  }
}

/** Variabel CSS untuk satu halaman/kanvas bertema. */
export function themeStyle(r: Resolved): CSSProperties {
  const btn = Math.max(0, Math.round(r.shadow * 0.8));
  return {
    "--bg": r.bg,
    "--surface": r.surface,
    "--fg": r.fg,
    "--line": r.line,
    "--shadow-color": r.shadowColor,
    "--accent": r.accent,
    "--on-accent": r.onAccent,
    "--danger": r.danger,
    "--bw": `${r.border}px`,
    "--bw-strong": `${r.border + 1}px`,
    "--shadow-x": `${r.shadow}px`,
    "--shadow-y": `${r.shadow}px`,
    "--btn-shadow": `${btn}px`,
    "--radius": `${r.radius}px`,
    "--ff-display": FONT_FAMILIES[r.font],
    "--ff-body": BODY_FONT[r.font],
    background: r.bg,
    color: r.fg,
    fontFamily: BODY_FONT[r.font],
    ...decorStyle(r),
  } as unknown as CSSProperties;
}

/** Gaya per soal (menimpa tema untuk satu kartu). */
export function fieldStyleVars(s?: FieldStyle): CSSProperties | undefined {
  if (!s) return undefined;
  const o: Record<string, string | number> = {};
  if (s.bg) { o["--surface"] = s.bg; o.background = s.bg; }
  if (s.fg) { o["--fg"] = s.fg; o.color = s.fg; }
  if (s.line) o["--line"] = s.line;
  if (s.radius !== undefined) { o["--radius"] = `${s.radius}px`; o.borderRadius = `${s.radius}px`; }
  if (s.shadow !== undefined) o.boxShadow = s.shadow === 0 ? "none" : `${s.shadow}px ${s.shadow}px 0 var(--shadow-color)`;
  if (s.font) { o["--ff-display"] = FONT_FAMILIES[s.font]; o["--ff-body"] = BODY_FONT[s.font]; o.fontFamily = BODY_FONT[s.font]; }
  return Object.keys(o).length ? (o as unknown as CSSProperties) : undefined;
}

export const labelSizeClass = (s?: FieldStyle["labelSize"]) => (s === "sm" ? "text-base" : s === "lg" ? "text-2xl" : "text-lg");

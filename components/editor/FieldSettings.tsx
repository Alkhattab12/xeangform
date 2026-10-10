"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { newOptionId } from "@/lib/forms/field-meta";
import { FILE_CATEGORIES, type FileCategory, type FormField } from "@/lib/forms/schema";

type Props = { field: FormField; onChange: (patch: Partial<FormField>) => void };

const TEXTY = new Set<string>(["short_text", "long_text", "email", "phone", "number", "url"]);
const CHOICE = new Set<string>(["radio", "checkbox", "dropdown"]);
const FILE_LABEL: Record<FileCategory, string> = {
  pdf: "PDF",
  image: "Gambar (JPG, PNG, WebP)",
  document: "Dokumen (DOC, DOCX, TXT)",
  spreadsheet: "Spreadsheet (XLS, XLSX, CSV)",
};
const lbl = "mb-1 block font-display text-sm font-bold";

function toInt(s: string, lo: number, hi: number): number | undefined {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.trunc(n))) : undefined;
}
function toNum(s: string): number | undefined {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.min(1e12, Math.max(-1e12, n)) : undefined;
}

export function FieldSettings({ field, onChange }: Props) {
  const t = field.type;
  const id = (s: string) => `${field.id}-${s}`;

  if (t === "divider") return <p className="leading-relaxed">Pembatas tidak punya pengaturan. Hapus atau pindahkan lewat kanvas.</p>;

  const isLayout = t === "section" || t === "paragraph";
  const options = field.options ?? [];
  const scale = field.scale ?? { min: 1, max: 5 };
  const file = field.file ?? { accept: ["pdf", "image"] as FileCategory[], maxSizeMb: 10, maxFiles: 1 };
  const setFile = (p: Partial<typeof file>) => onChange({ file: { ...file, ...p } });

  const setOpt = (i: number, label: string) => onChange({ options: options.map((o, j) => (j === i ? { ...o, label } : o)) });
  const moveOpt = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ options: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={id("label")} className={lbl}>
          {t === "paragraph" ? "Isi teks" : t === "section" ? "Judul bagian" : t === "consent" ? "Teks persetujuan" : "Pertanyaan"}
        </label>
        {t === "paragraph" || t === "consent" ? (
          <textarea id={id("label")} rows={3} className="nb-input" value={field.label} maxLength={2000} onChange={(e) => onChange({ label: e.target.value })} />
        ) : (
          <input id={id("label")} className="nb-input" value={field.label} maxLength={300} onChange={(e) => onChange({ label: e.target.value })} />
        )}
      </div>

      {t !== "paragraph" && (
        <div>
          <label htmlFor={id("desc")} className={lbl}>Keterangan (opsional)</label>
          <textarea id={id("desc")} rows={2} className="nb-input" value={field.description ?? ""} maxLength={1000} onChange={(e) => onChange({ description: e.target.value || undefined })} />
        </div>
      )}

      {!isLayout && (
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" className="h-5 w-5 accent-[#3457ff]" checked={field.required} onChange={(e) => onChange({ required: e.target.checked })} />
          Wajib diisi
        </label>
      )}

      {TEXTY.has(t) && (
        <div>
          <label htmlFor={id("ph")} className={lbl}>Placeholder</label>
          <input id={id("ph")} className="nb-input" value={field.placeholder ?? ""} maxLength={200} onChange={(e) => onChange({ placeholder: e.target.value || undefined })} />
        </div>
      )}

      {(t === "short_text" || t === "long_text") && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id("minl")} className={lbl}>Min. karakter</label>
            <input id={id("minl")} type="number" inputMode="numeric" min={0} className="nb-input" defaultValue={field.minLength ?? ""} onChange={(e) => onChange({ minLength: toInt(e.target.value, 0, 10000) })} />
          </div>
          <div>
            <label htmlFor={id("maxl")} className={lbl}>Maks. karakter</label>
            <input id={id("maxl")} type="number" inputMode="numeric" min={0} className="nb-input" defaultValue={field.maxLength ?? ""} onChange={(e) => onChange({ maxLength: toInt(e.target.value, 0, 10000) })} />
          </div>
        </div>
      )}

      {t === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id("min")} className={lbl}>Nilai minimum</label>
            <input id={id("min")} type="number" className="nb-input" defaultValue={field.min ?? ""} onChange={(e) => onChange({ min: toNum(e.target.value) })} />
          </div>
          <div>
            <label htmlFor={id("max")} className={lbl}>Nilai maksimum</label>
            <input id={id("max")} type="number" className="nb-input" defaultValue={field.max ?? ""} onChange={(e) => onChange({ max: toNum(e.target.value) })} />
          </div>
        </div>
      )}

      {CHOICE.has(t) && (
        <fieldset>
          <legend className={lbl}>Opsi jawaban</legend>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={o.id} className="flex items-center gap-1">
                <input aria-label={`Opsi ${i + 1}`} className="nb-input" value={o.label} maxLength={200} onChange={(e) => setOpt(i, e.target.value)} />
                <button type="button" aria-label={`Naikkan opsi ${i + 1}`} disabled={i === 0} onClick={() => moveOpt(i, -1)} className="flex h-11 w-9 shrink-0 items-center justify-center border-2 border-line disabled:opacity-40"><ArrowUp size={16} aria-hidden="true" /></button>
                <button type="button" aria-label={`Turunkan opsi ${i + 1}`} disabled={i === options.length - 1} onClick={() => moveOpt(i, 1)} className="flex h-11 w-9 shrink-0 items-center justify-center border-2 border-line disabled:opacity-40"><ArrowDown size={16} aria-hidden="true" /></button>
                <button type="button" aria-label={`Hapus opsi ${i + 1}`} onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} className="flex h-11 w-9 shrink-0 items-center justify-center border-2 border-line"><X size={16} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={options.length >= 100}
            onClick={() => onChange({ options: [...options, { id: newOptionId(), label: `Opsi ${options.length + 1}` }] })}
            className="nb-btn nb-btn-ghost mt-3 min-h-10 px-3 py-2 text-sm"
          >
            <Plus size={16} aria-hidden="true" /> Tambah opsi
          </button>
          {t !== "dropdown" && (
            <label className="mt-4 flex items-center gap-3 font-bold">
              <input type="checkbox" className="h-5 w-5 accent-[#3457ff]" checked={!!field.allowOther} onChange={(e) => onChange({ allowOther: e.target.checked })} />
              Sediakan opsi &quot;Lainnya&quot;
            </label>
          )}
        </fieldset>
      )}

      {t === "linear_scale" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("smin")} className={lbl}>Mulai dari</label>
              <select id={id("smin")} className="nb-input" value={scale.min} onChange={(e) => onChange({ scale: { ...scale, min: Number(e.target.value) } })}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div>
              <label htmlFor={id("smax")} className={lbl}>Sampai</label>
              <select id={id("smax")} className="nb-input" value={scale.max} onChange={(e) => onChange({ scale: { ...scale, max: Number(e.target.value) } })}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={id("sminl")} className={lbl}>Label ujung kiri</label>
            <input id={id("sminl")} className="nb-input" maxLength={60} value={scale.minLabel ?? ""} onChange={(e) => onChange({ scale: { ...scale, minLabel: e.target.value || undefined } })} />
          </div>
          <div>
            <label htmlFor={id("smaxl")} className={lbl}>Label ujung kanan</label>
            <input id={id("smaxl")} className="nb-input" maxLength={60} value={scale.maxLabel ?? ""} onChange={(e) => onChange({ scale: { ...scale, maxLabel: e.target.value || undefined } })} />
          </div>
        </div>
      )}

      {t === "rating" && (
        <div>
          <label htmlFor={id("rmax")} className={lbl}>Jumlah bintang</label>
          <select id={id("rmax")} className="nb-input" value={field.ratingMax ?? 5} onChange={(e) => onChange({ ratingMax: Number(e.target.value) })}>
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {t === "file" && (
        <div className="space-y-4">
          <fieldset>
            <legend className={lbl}>Tipe file yang diizinkan</legend>
            <ul className="space-y-2">
              {FILE_CATEGORIES.map((c) => (
                <li key={c}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#3457ff]"
                      checked={file.accept.includes(c)}
                      onChange={(e) => setFile({ accept: e.target.checked ? [...file.accept, c] : file.accept.filter((x) => x !== c) })}
                    />
                    {FILE_LABEL[c]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("fsize")} className={lbl}>Maks. ukuran (MB)</label>
              <input id={id("fsize")} type="number" inputMode="numeric" min={1} max={25} className="nb-input" defaultValue={file.maxSizeMb} onChange={(e) => setFile({ maxSizeMb: toInt(e.target.value, 1, 25) ?? 10 })} />
            </div>
            <div>
              <label htmlFor={id("fcount")} className={lbl}>Maks. jumlah file</label>
              <input id={id("fcount")} type="number" inputMode="numeric" min={1} max={10} className="nb-input" defaultValue={file.maxFiles} onChange={(e) => setFile({ maxFiles: toInt(e.target.value, 1, 10) ?? 1 })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

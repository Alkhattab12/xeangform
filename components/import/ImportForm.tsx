"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { importForm } from "@/app/actions/import";
import { FIELD_META } from "@/lib/forms/field-meta";
import { AI_PROMPT, MAX_IMPORT_BYTES, parseImport } from "@/lib/forms/portable";

export function ImportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const result = useMemo(() => (text.trim() ? parseImport(text) : null), [text]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setNote("File terlalu besar (maksimal 500 KB).");
      return;
    }
    setNote("");
    setServerErrors([]);
    setText(await file.text());
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setNote("Prompt disalin. Tempel ke AI, lalu isi bagian PERMINTAAN SAYA.");
    } catch {
      setNote("Gagal menyalin otomatis. Buka isi prompt di bawah dan salin manual.");
    }
  }

  async function create() {
    if (!result?.ok || busy) return;
    setBusy(true);
    setServerErrors([]);
    try {
      const res = await importForm(text);
      if (res.ok) {
        router.push(`/dashboard/forms/${res.id}`);
        return; // tombol tetap nonaktif sampai halaman berpindah
      }
      setServerErrors(res.errors);
    } catch {
      setServerErrors(["Koneksi bermasalah. Coba lagi."]);
    }
    setBusy(false);
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="nb-panel nb-panel-strong p-5">
        <p className="nb-mono mb-2">Langkah 1 / opsional</p>
        <h2 className="font-display text-2xl font-bold">Minta AI membuatkan soal</h2>
        <p className="mt-2 leading-relaxed">
          Salin prompt ini ke AI favoritmu (ChatGPT, Claude, Gemini), tulis form yang kamu mau di bagian akhir, lalu simpan jawabannya sebagai file .json atau tempel di bawah.
        </p>
        <button type="button" onClick={() => void copyPrompt()} className="nb-btn mt-4">Salin prompt untuk AI</button>
        <details className="mt-4">
          <summary className="cursor-pointer font-bold">Lihat isi prompt</summary>
          <textarea readOnly rows={12} value={AI_PROMPT} aria-label="Isi prompt untuk AI" className="nb-input mt-3 font-mono text-xs" />
        </details>
      </section>

      <section className="nb-panel nb-panel-strong p-5">
        <p className="nb-mono mb-2">Langkah 2</p>
        <h2 className="font-display text-2xl font-bold">Masukkan file atau teks JSON</h2>
        <label htmlFor="import-file" className="mb-2 mt-4 block font-display font-bold">Pilih file .json</label>
        <input id="import-file" type="file" accept=".json,application/json,text/plain" onChange={(e) => void onFile(e)} className="nb-input" />
        <label htmlFor="import-text" className="mb-2 mt-5 block font-display font-bold">Atau tempel JSON di sini</label>
        <textarea
          id="import-text"
          rows={10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setServerErrors([]);
          }}
          spellCheck={false}
          placeholder='{"format":"syamil-form","version":1,"form":{"title":"...","fields":[...]}}'
          className="nb-input font-mono text-xs"
        />
      </section>

      <p role="status" aria-live="polite" className="nb-mono">{note}</p>

      {result && !result.ok && (
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 text-ink">
          <p className="font-bold">Belum bisa diimpor:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      )}

      {result?.ok && (
        <section className="nb-panel nb-panel-strong nb-shadow p-5">
          <p className="nb-mono mb-2">Pratinjau</p>
          <h2 className="font-display text-3xl font-bold">{result.form.title}</h2>
          {result.form.description && <p className="mt-2">{result.form.description}</p>}
          <p className="nb-mono mt-3">{result.form.fields.length} kolom</p>
          <ol className="mt-4 space-y-2">
            {result.form.fields.slice(0, 30).map((f, i) => (
              <li key={f.id} className="flex gap-3 border-2 border-line p-2">
                <span className="nb-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="nb-mono block">{FIELD_META[f.type].label}{f.required ? " · wajib" : ""}</span>
                  <span className="block truncate">{f.label || "(tanpa judul)"}</span>
                </span>
              </li>
            ))}
          </ol>
          {result.form.fields.length > 30 && <p className="mt-2">…dan {result.form.fields.length - 30} kolom lain.</p>}
          {result.warnings.length > 0 && (
            <div className="mt-4 border-2 border-line p-3">
              <p className="font-bold">Perlu perhatian:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {result.warnings.map((w, i) => (<li key={i}>{w}</li>))}
              </ul>
            </div>
          )}
          {serverErrors.length > 0 && (
            <div role="alert" className="nb-panel mt-4 border-[3px] bg-orange p-3 font-bold text-ink">
              {serverErrors.map((e, i) => (<p key={i}>{e}</p>))}
            </div>
          )}
          <button type="button" onClick={() => void create()} disabled={busy} className="nb-btn mt-5">
            {busy ? "Membuat form…" : "Buat form dari impor"}
          </button>
        </section>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { submitResponse } from "@/app/actions/submit";
import type { FormField } from "@/lib/forms/schema";
import { OTHER, validateAnswers } from "@/lib/forms/validate";

type Props = { slug: string; title: string; description: string; fields: FormField[] };
type ChoiceAnswer = { optionId?: string; other?: string };
type MultiAnswer = { optionIds?: string[]; other?: string };

const TEXT_INPUTS: Record<string, { type: string; inputMode?: "text" | "decimal" | "email" | "tel" | "url"; autoComplete?: string }> = {
  short_text: { type: "text" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  url: { type: "url", inputMode: "url" },
  date: { type: "date" },
  time: { type: "time" },
  number: { type: "number", inputMode: "decimal" },
};
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";
const chip =
  "flex h-12 min-w-12 items-center justify-center border-2 border-line bg-surface px-2 font-display font-bold peer-checked:bg-accent peer-checked:text-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cobalt";

export function PublicForm({ slug, title, description, fields }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [formError, setFormError] = useState("");
  const [hp, setHp] = useState("");
  const keyRef = useRef<string | null>(null);

  const set = (id: string, value: unknown) => {
    setAnswers((p) => ({ ...p, [id]: value }));
    setErrors((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  function focusFirst(errs: Record<string, string>) {
    const first = fields.find((f) => errs[f.id]);
    if (first) document.getElementById(`q-${first.id}`)?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return; // cegah kirim ganda
    setFormError("");

    const result = validateAnswers(fields, answers);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirst(result.errors);
      return;
    }
    setErrors({});
    setStatus("submitting");
    if (!keyRef.current) keyRef.current = crypto.randomUUID(); // kunci tetap sama saat kirim ulang

    try {
      const res = await submitResponse(slug, { answers, clientKey: keyRef.current, website: hp });
      if (res.ok) {
        setStatus("done");
        return;
      }
      setStatus("idle");
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        focusFirst(res.fieldErrors);
      }
      if (res.error) setFormError(res.error);
    } catch {
      setStatus("idle");
      setFormError("Koneksi bermasalah. Jawabanmu belum terkirim — coba kirim lagi, isianmu masih ada.");
    }
  }

  function again() {
    setAnswers({});
    setErrors({});
    setFormError("");
    keyRef.current = null;
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="nb-panel nb-panel-strong nb-shadow bg-accent p-8 text-ink" role="status">
        <p className="nb-mono mb-3">Terkirim</p>
        <h1 className="font-display text-4xl font-bold">Terima kasih!</h1>
        <p className="mt-4 leading-relaxed">Jawabanmu untuk &quot;{title}&quot; sudah tersimpan.</p>
        <button type="button" onClick={again} className="nb-btn nb-btn-ink mt-6">Kirim respons lain</button>
      </div>
    );
  }

  const reqMark = (f: FormField) =>
    f.required ? (
      <>
        <span aria-hidden="true"> *</span>
        <span className="sr-only"> (wajib)</span>
      </>
    ) : null;

  function renderField(f: FormField) {
    if (f.type === "divider") return <hr key={f.id} className="border-t-[3px] border-line" />;
    if (f.type === "section") {
      return (
        <div key={f.id} className="pt-4">
          <h2 className="font-display text-3xl font-bold">{f.label}</h2>
          {f.description && <p className="mt-2 leading-relaxed">{f.description}</p>}
        </div>
      );
    }
    if (f.type === "paragraph") return <p key={f.id} className="whitespace-pre-wrap leading-relaxed">{f.label}</p>;

    const id = `q-${f.id}`;
    const err = errors[f.id];
    const describedBy = [f.description ? `${id}-desc` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
    const invalid = err ? true : undefined;
    const desc = f.description ? <p id={`${id}-desc`} className="mb-2 text-sm leading-relaxed">{f.description}</p> : null;
    const errEl = err ? (
      <p id={`${id}-error`} role="alert" className="mt-2 font-bold text-[#c62f00] dark:text-orange">{err}</p>
    ) : null;
    const legendCls = "mb-2 block p-0 font-display font-bold";
    const groupCls = "m-0 min-w-0 border-0 p-0";

    // ----- kolom berkelompok (fieldset) -----
    if (f.type === "radio") {
      const v = (answers[f.id] as ChoiceAnswer | undefined) ?? {};
      return (
        <fieldset key={f.id} id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={legendCls}>{f.label}{reqMark(f)}</legend>
          {desc}
          {(f.options ?? []).map((o) => (
            <label key={o.id} className={choice}>
              <input type="radio" name={f.id} className={box} checked={v.optionId === o.id} onChange={() => set(f.id, { ...v, optionId: o.id })} />
              {o.label}
            </label>
          ))}
          {f.allowOther && (
            <div className="flex flex-wrap items-center gap-3">
              <label className={choice}>
                <input type="radio" name={f.id} className={box} checked={v.optionId === OTHER} onChange={() => set(f.id, { ...v, optionId: OTHER })} />
                Lainnya
              </label>
              {v.optionId === OTHER && (
                <input aria-label="Jawaban lainnya" className="nb-input max-w-xs" maxLength={500} value={v.other ?? ""} onChange={(e) => set(f.id, { ...v, other: e.target.value })} />
              )}
            </div>
          )}
          {errEl}
        </fieldset>
      );
    }

    if (f.type === "checkbox") {
      const v = (answers[f.id] as MultiAnswer | undefined) ?? {};
      const ids = v.optionIds ?? [];
      const toggle = (oid: string, on: boolean) => set(f.id, { ...v, optionIds: on ? [...ids, oid] : ids.filter((x) => x !== oid) });
      return (
        <fieldset key={f.id} id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={legendCls}>{f.label}{reqMark(f)}</legend>
          {desc}
          {(f.options ?? []).map((o) => (
            <label key={o.id} className={choice}>
              <input type="checkbox" className={box} checked={ids.includes(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} />
              {o.label}
            </label>
          ))}
          {f.allowOther && (
            <div className="flex flex-wrap items-center gap-3">
              <label className={choice}>
                <input type="checkbox" className={box} checked={ids.includes(OTHER)} onChange={(e) => toggle(OTHER, e.target.checked)} />
                Lainnya
              </label>
              {ids.includes(OTHER) && (
                <input aria-label="Jawaban lainnya" className="nb-input max-w-xs" maxLength={500} value={v.other ?? ""} onChange={(e) => set(f.id, { ...v, other: e.target.value })} />
              )}
            </div>
          )}
          {errEl}
        </fieldset>
      );
    }

    if (f.type === "linear_scale") {
      const s = f.scale ?? { min: 1, max: 5 };
      const cur = answers[f.id] as number | undefined;
      const nums = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);
      return (
        <fieldset key={f.id} id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={legendCls}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="flex flex-wrap gap-2">
            {nums.map((n) => (
              <div key={n} className="relative">
                <input type="radio" id={`${id}-${n}`} name={f.id} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={cur === n} onChange={() => set(f.id, n)} />
                <label htmlFor={`${id}-${n}`} className={chip}>{n}</label>
              </div>
            ))}
          </div>
          {(s.minLabel || s.maxLabel) && (
            <p className="nb-mono mt-2 flex justify-between gap-4"><span>{s.minLabel}</span><span>{s.maxLabel}</span></p>
          )}
          {errEl}
        </fieldset>
      );
    }

    if (f.type === "rating") {
      const max = f.ratingMax ?? 5;
      const cur = answers[f.id] as number | undefined;
      return (
        <fieldset key={f.id} id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={legendCls}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <div key={n} className="relative">
                <input type="radio" id={`${id}-${n}`} name={f.id} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={cur === n} onChange={() => set(f.id, n)} />
                <label
                  htmlFor={`${id}-${n}`}
                  aria-label={`${n} bintang`}
                  className="flex h-12 w-10 items-center justify-center text-4xl leading-none peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cobalt"
                >
                  {cur !== undefined && n <= cur ? "★" : "☆"}
                </label>
              </div>
            ))}
          </div>
          {errEl}
        </fieldset>
      );
    }

    if (f.type === "consent") {
      return (
        <div key={f.id}>
          <label className="flex cursor-pointer items-start gap-3">
            <input id={id} type="checkbox" className={`${box} mt-1`} aria-describedby={describedBy} aria-invalid={invalid} checked={answers[f.id] === true} onChange={(e) => set(f.id, e.target.checked)} />
            <span>{f.label}{reqMark(f)}</span>
          </label>
          {errEl}
        </div>
      );
    }

    if (f.type === "file") {
      return (
        <div key={f.id}>
          <p className="mb-2 font-display font-bold">{f.label}{reqMark(f)}</p>
          {desc}
          <div id={id} tabIndex={-1} className="border-2 border-dashed border-line p-4">
            Kolom unggah file sedang disiapkan dan belum bisa dipakai.
          </div>
          {errEl}
        </div>
      );
    }

    // ----- kolom satu input -----
    const label = <label htmlFor={id} className="mb-2 block font-display font-bold">{f.label}{reqMark(f)}</label>;
    const common = { id, name: f.id, "aria-describedby": describedBy, "aria-invalid": invalid };
    const value = typeof answers[f.id] === "string" ? (answers[f.id] as string) : "";

    if (f.type === "long_text") {
      return (
        <div key={f.id}>
          {label}{desc}
          <textarea {...common} rows={4} className="nb-input" placeholder={f.placeholder} maxLength={f.maxLength ?? 10000} value={value} onChange={(e) => set(f.id, e.target.value)} />
          {errEl}
        </div>
      );
    }
    if (f.type === "dropdown") {
      const cur = (answers[f.id] as ChoiceAnswer | undefined)?.optionId ?? "";
      return (
        <div key={f.id}>
          {label}{desc}
          <select {...common} className="nb-input" value={cur} onChange={(e) => set(f.id, { optionId: e.target.value })}>
            <option value="">Pilih salah satu…</option>
            {(f.options ?? []).map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
          {errEl}
        </div>
      );
    }

    const t = TEXT_INPUTS[f.type] ?? TEXT_INPUTS.short_text;
    return (
      <div key={f.id}>
        {label}{desc}
        <input
          {...common}
          type={t.type}
          inputMode={t.inputMode}
          autoComplete={t.autoComplete}
          step={f.type === "number" ? "any" : undefined}
          className="nb-input"
          placeholder={f.placeholder}
          maxLength={f.type === "short_text" ? (f.maxLength ?? 1000) : undefined}
          value={value}
          onChange={(e) => set(f.id, e.target.value)}
        />
        {errEl}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="nb-panel nb-panel-strong nb-shadow space-y-7 p-6 sm:p-8">
      <header>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{description}</p>}
        <p className="nb-mono mt-4">* wajib diisi</p>
      </header>

      {/* Honeypot: tersembunyi dari manusia dan screen reader */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>

      {fields.map(renderField)}

      {formError && (
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">{formError}</div>
      )}

      <button type="submit" className="nb-btn w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Mengirim…" : "Kirim"}
      </button>
    </form>
  );
}

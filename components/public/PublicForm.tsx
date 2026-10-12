"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { submitResponse, type QuizResult } from "@/app/actions/submit";
import { useBusyOverlay } from "@/components/ui/LoadingProvider";
import { firstErrorFieldId, pageIndexOf, splitPages } from "@/lib/forms/pages";
import { isInputType, type FormField, type FormSettings } from "@/lib/forms/schema";
import { fieldStyleVars, labelSizeClass } from "@/lib/forms/theme";
import { MiniAudioPlayer } from "./MiniAudioPlayer";
import { playTactileSfx } from "@/lib/audio/engine";
import type { ThemePreset } from "@/lib/forms/schema";
import { GateCard } from "./GateCard";

type Props = {
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  themePreset?: ThemePreset | null;
};
type ChoiceAnswer = { optionId?: string; other?: string };
type MultiAnswer = { optionIds?: string[]; other?: string };
type Status = "idle" | "submitting" | "done" | "already" | "login";

const TEXT_INPUTS: Record<string, { type: string; inputMode?: "text" | "decimal" | "email" | "tel" | "url"; autoComplete?: string }> = {
  short_text: { type: "text" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  url: { type: "url", inputMode: "url" },
  date: { type: "date" },
  time: { type: "time" },
  number: { type: "number", inputMode: "decimal" },
};

// Jarak: kartu soal berpadding lega; jarak antar kartu 24px (HP) / 32px (layar lebar)
const card = "nb-panel nb-panel-strong scroll-mt-24 p-5 sm:p-7";
const errRing = "outline-4 outline-solid outline-offset-2 outline-[color:var(--danger)]";
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";
const chip =
  "flex h-12 min-w-12 items-center justify-center border-2 border-line bg-surface px-2 font-display font-bold peer-checked:bg-accent peer-checked:text-[color:var(--on-accent)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cobalt";
const groupCls = "m-0 min-w-0 border-0 p-0";

const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Menggulir ke kartu soal lalu memberi fokus ke kontrolnya. */
function focusField(fid: string) {
  const cardEl = document.getElementById(`card-${fid}`);
  const el = document.getElementById(`q-${fid}`);
  (cardEl ?? el)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "center" });
  el?.focus({ preventScroll: true });
}

export function PublicForm({ slug, title, description, fields, settings, themePreset }: Props) {
  const enforce = !settings.allowTabSwitch;
  const pages = useMemo(() => splitPages(fields), [fields]);
  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [hp, setHp] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const keyRef = useRef<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const firstRender = useRef(true);
  useBusyOverlay(status === "submitting");

  const isLast = pageIdx >= pages.length - 1;
  const current = pages[Math.min(pageIdx, pages.length - 1)];

  // ---- Deteksi pindah tab / minimize (hanya jika "Tidak boleh") ----
  const [vCount, setVCount] = useState(0);
  const [warn, setWarn] = useState(false);
  const countRef = useRef(0);
  const events = useRef<{ k: "tab" | "window"; t: string }[]>([]);
  const lastAt = useRef(0);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enforce || status === "done") return;
    const record = (k: "tab" | "window") => {
      const now = Date.now();
      if (now - lastAt.current < 1000) return; // satu perpindahan memicu beberapa event; hitung sekali
      lastAt.current = now;
      countRef.current += 1;
      if (events.current.length < 50) events.current.push({ k, t: new Date(now).toISOString() });
      setVCount(countRef.current);
      setWarn(true);
    };
    const onVisibility = () => {
      if (document.hidden) record("tab");
    };
    const onBlur = () => record("window");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [enforce, status]);

  useEffect(() => {
    if (warn) okRef.current?.focus();
  }, [warn]);

  // Setelah pindah halaman: fokus ke soal bermasalah (jika ada), kalau tidak gulir ke atas
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const target = pendingFocus.current;
    pendingFocus.current = null;
    const raf = requestAnimationFrame(() => {
      if (target) focusField(target);
      else window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pageIdx]);

  const set = (id: string, value: unknown) => {
    if (settings.audio?.sfxEnabled) playTactileSfx("click");
    setAnswers((p) => ({ ...p, [id]: value }));
    setErrors((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  /** Tampilkan error dan arahkan ke soal pertama yang bermasalah (pindah halaman jika perlu). */
  function revealErrors(errs: Record<string, string>, scope: FormField[]) {
    setErrors(errs);
    const id = firstErrorFieldId(scope, errs);
    if (!id) return;
    const pi = pageIndexOf(pages, id);
    if (pi >= 0 && pi !== pageIdx) {
      pendingFocus.current = id;
      setPageIdx(pi);
    } else {
      requestAnimationFrame(() => focusField(id));
    }
  }

  function jumpTo(fid: string) {
    const pi = pageIndexOf(pages, fid);
    if (pi >= 0 && pi !== pageIdx) {
      pendingFocus.current = fid;
      setPageIdx(pi);
    } else {
      focusField(fid);
    }
  }

  function goNext() {
    const r = validateAnswers(current.fields, answers);
    if (!r.ok) {
      if (settings.audio?.sfxEnabled) playTactileSfx("warn");
      revealErrors(r.errors, current.fields);
      return;
    }
    if (settings.audio?.sfxEnabled) playTactileSfx("page");
    setErrors({});
    setPageIdx((i) => Math.min(i + 1, pages.length - 1));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return; // cegah kirim ganda
    setFormError("");
    if (!isLast) {
      goNext(); // Enter di halaman tengah = Lanjut, bukan kirim
      return;
    }

    // Semua halaman divalidasi ulang: soal wajib tidak boleh terlewat
    const check = validateAnswers(fields, answers);
    if (!check.ok) {
      revealErrors(check.errors, fields);
      return;
    }
    setErrors({});
    setStatus("submitting");
    if (!keyRef.current) keyRef.current = crypto.randomUUID(); // kunci tetap sama saat kirim ulang

    try {
      const res = await submitResponse(slug, {
        answers,
        clientKey: keyRef.current,
        website: hp,
        violations: enforce ? { count: countRef.current, events: events.current } : undefined,
      });
      if (res.ok) {
        if (settings.audio?.sfxEnabled) playTactileSfx("success");
        setResult(res.result ?? null);
        setStatus("done");
        return;
      }
      if (res.alreadySubmitted) {
        setStatus("already");
        return;
      }
      if (res.needsLogin) {
        setStatus("login");
        return;
      }
      setStatus("idle");
      if (res.fieldErrors) {
        if (settings.audio?.sfxEnabled) playTactileSfx("warn");
        revealErrors(res.fieldErrors, fields);
      }
      if (res.error) setFormError(res.error);
    } catch {
      setStatus("idle");
      setFormError("Koneksi bermasalah. Jawabanmu belum terkirim. Coba kirim lagi, isianmu masih ada.");
    }
  }

  function again() {
    setAnswers({});
    setErrors({});
    setFormError("");
    setResult(null);
    keyRef.current = null;
    countRef.current = 0;
    events.current = [];
    setVCount(0);
    setPageIdx(0);
    setStatus("idle");
  }

  if (status === "already") return <GateCard kind="done" slug={slug} title={title} score={null} />;
  if (status === "login") return <GateCard kind="login" slug={slug} title={title} />;

  if (status === "done") {
    return (
      <>
        <div className="nb-panel nb-panel-strong nb-shadow bg-accent p-6 text-[color:var(--on-accent)] sm:p-8" role="status">
          <p className="nb-mono mb-3">Terkirim</p>
          <h1 className="font-display text-4xl font-bold">Terima kasih!</h1>
          <p className="mt-5 leading-relaxed">Jawabanmu untuk &quot;{title}&quot; sudah tersimpan.</p>
          {result && result.total > 0 && (
            <p className="mt-8 border-t-[3px] border-current pt-6 font-display text-4xl font-bold">
              Benar {result.correct} dari {result.total} soal
            </p>
          )}
          {!settings.oneResponsePerAccount && (
            <button type="button" onClick={again} className="nb-btn nb-btn-ink mt-8">Kirim respons lain</button>
          )}
        </div>
        {settings.audio?.enabled && (
          <MiniAudioPlayer
            audioSettings={settings.audio}
            themePreset={themePreset}
            formSubmitted={true}
          />
        )}
      </>
    );
  }

  const reqMark = (f: FormField) =>
    f.required ? (
      <>
        <span aria-hidden="true"> *</span>
        <span className="sr-only"> (wajib)</span>
      </>
    ) : null;

  const errorFields = fields.filter((f) => isInputType(f.type) && errors[f.id]);

  function renderField(f: FormField) {
    const styleVars = fieldStyleVars(f.style);
    if (f.type === "divider") return <hr key={f.id} className="my-1 border-t-[3px] border-line sm:my-2" />;
    if (f.type === "section") {
      return (
        <div key={f.id} className={`px-1 pt-4 sm:pt-6 ${f.style?.bg ? "nb-panel p-5" : ""}`} style={styleVars}>
          <h2 className="font-display text-3xl font-bold">{f.label}</h2>
          {f.description && <p className="mt-3 leading-relaxed">{f.description}</p>}
        </div>
      );
    }
    if (f.type === "paragraph") {
      return (
        <p key={f.id} className={`whitespace-pre-wrap px-1 leading-relaxed ${f.style?.bg ? "nb-panel p-5" : ""}`} style={styleVars}>
          {f.label}
        </p>
      );
    }

    const id = `q-${f.id}`;
    const err = errors[f.id];
    const describedBy = [f.description ? `${id}-desc` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
    const invalid = err ? true : undefined;
    const lblCls = `mb-3 block font-display font-bold ${labelSizeClass(f.style?.labelSize)}`;
    const wrap = (content: React.ReactNode) => (
      <div key={f.id} id={`card-${f.id}`} className={`${card} ${err ? errRing : ""}`} style={styleVars}>
        {content}
      </div>
    );
    const desc = f.description ? <p id={`${id}-desc`} className="-mt-1 mb-4 text-sm leading-relaxed">{f.description}</p> : null;
    const errEl = err ? (
      <p id={`${id}-error`} role="alert" className="mt-4 flex items-start gap-2 font-bold text-[color:var(--danger)]">
        <span aria-hidden="true">⚠</span>
        <span>{err}</span>
      </p>
    ) : null;

    if (f.type === "radio") {
      const v = (answers[f.id] as ChoiceAnswer | undefined) ?? {};
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="space-y-1">
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
          </div>
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "checkbox") {
      const v = (answers[f.id] as MultiAnswer | undefined) ?? {};
      const ids = v.optionIds ?? [];
      const toggle = (oid: string, on: boolean) => set(f.id, { ...v, optionIds: on ? [...ids, oid] : ids.filter((x) => x !== oid) });
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="space-y-1">
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
          </div>
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "linear_scale") {
      const s = f.scale ?? { min: 1, max: 5 };
      const cur = answers[f.id] as number | undefined;
      const nums = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
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
            <p className="nb-mono mt-3 flex justify-between gap-4"><span>{s.minLabel}</span><span>{s.maxLabel}</span></p>
          )}
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "rating") {
      const max = f.ratingMax ?? 5;
      const cur = answers[f.id] as number | undefined;
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
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
        </fieldset>,
      );
    }

    if (f.type === "consent") {
      return wrap(
        <>
          <label className="flex cursor-pointer items-start gap-3">
            <input id={id} type="checkbox" className={`${box} mt-1`} aria-describedby={describedBy} aria-invalid={invalid} checked={answers[f.id] === true} onChange={(e) => set(f.id, e.target.checked)} />
            <span>{f.label}{reqMark(f)}</span>
          </label>
          {errEl}
        </>,
      );
    }

    if (f.type === "file") {
      return wrap(
        <>
          <p className={lblCls}>{f.label}{reqMark(f)}</p>
          {desc}
          <div id={id} tabIndex={-1} className="border-2 border-dashed border-line p-4">
            Kolom unggah file sedang disiapkan dan belum bisa dipakai.
          </div>
          {errEl}
        </>,
      );
    }

    // ----- kolom satu input -----
    const label = <label htmlFor={id} className={lblCls}>{f.label}{reqMark(f)}</label>;
    const common = { id, name: f.id, "aria-describedby": describedBy, "aria-invalid": invalid };
    const value = typeof answers[f.id] === "string" ? (answers[f.id] as string) : "";

    if (f.type === "long_text") {
      return wrap(
        <>
          {label}{desc}
          <textarea {...common} rows={4} className="nb-input" placeholder={f.placeholder} maxLength={f.maxLength ?? 10000} value={value} onChange={(e) => set(f.id, e.target.value)} />
          {errEl}
        </>,
      );
    }
    if (f.type === "dropdown") {
      const cur = (answers[f.id] as ChoiceAnswer | undefined)?.optionId ?? "";
      return wrap(
        <>
          {label}{desc}
          <select {...common} className="nb-input" value={cur} onChange={(e) => set(f.id, { optionId: e.target.value })}>
            <option value="">Pilih salah satu…</option>
            {(f.options ?? []).map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
          {errEl}
        </>,
      );
    }

    const t = TEXT_INPUTS[f.type] ?? TEXT_INPUTS.short_text;
    return wrap(
      <>
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
      </>,
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 sm:gap-8">
        {pageIdx === 0 ? (
          <header className="nb-panel nb-panel-strong nb-shadow p-6 sm:p-8">
            {settings.quiz && <p className="nb-mono mb-3">Kuis</p>}
            <h1 className="break-words font-display text-4xl font-bold sm:text-5xl">{title}</h1>
            {description && <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed">{description}</p>}
            <p className="nb-mono mt-6">* wajib diisi</p>
          </header>
        ) : (
          <header className="nb-panel nb-panel-strong nb-shadow p-6 sm:p-8">
            <p className="nb-mono mb-2">{title}</p>
            <h1 className="break-words font-display text-3xl font-bold sm:text-4xl">{current.title || `Halaman ${pageIdx + 1}`}</h1>
            {current.description && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{current.description}</p>}
          </header>
        )}

        {pages.length > 1 && (
          <div className="nb-panel p-4" role="group" aria-label="Kemajuan halaman">
            <div className="flex items-center justify-between gap-3">
              <p className="nb-mono">Halaman {pageIdx + 1} dari {pages.length}</p>
              <p className="nb-mono">{Math.round(((pageIdx + 1) / pages.length) * 100)}%</p>
            </div>
            <div
              className="mt-3 h-3 border-2 border-line bg-surface"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={pages.length}
              aria-valuenow={pageIdx + 1}
              aria-label={`Halaman ${pageIdx + 1} dari ${pages.length}`}
            >
              <div className="h-full bg-accent" style={{ width: `${((pageIdx + 1) / pages.length) * 100}%` }} />
            </div>
          </div>
        )}

        {enforce && (
          <div role="note" className="nb-panel border-[3px] bg-lavender p-5 text-ink">
            <p className="font-display font-bold">Pengawasan aktif</p>
            <p className="mt-2 leading-relaxed">
              Jangan berpindah tab atau meminimalkan jendela selama mengisi. Pelanggaran dicatat dan dapat dilihat pembuat form.
              {vCount > 0 ? ` Tercatat: ${vCount} kali.` : ""}
            </p>
          </div>
        )}

        {errorFields.length > 0 && (
          <div role="alert" id="error-summary" className={`nb-panel border-[3px] p-5 ${errRing}`}>
            <p className="font-display text-lg font-bold text-[color:var(--danger)]">
              ⚠ Ada {errorFields.length} pertanyaan yang perlu diperbaiki
            </p>
            <ul className="mt-3 space-y-2">
              {errorFields.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => jumpTo(f.id)} className="text-left underline underline-offset-4">
                    {f.label || "(tanpa judul)"}
                  </button>
                  <span className="block text-sm">{errors[f.id]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Honeypot: tersembunyi dari manusia dan screen reader */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
        </div>

        {current.fields.map(renderField)}

        {formError && (
          <div role="alert" className="nb-panel border-[3px] bg-orange p-5 font-bold text-ink">{formError}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {pageIdx > 0 && (
            <button type="button" onClick={() => setPageIdx((i) => Math.max(0, i - 1))} className="nb-btn nb-btn-ghost">← Kembali</button>
          )}
          <button type="submit" className="nb-btn" disabled={status === "submitting"}>
            {status === "submitting" ? "Mengirim…" : isLast ? "Kirim" : "Lanjut →"}
          </button>
        </div>
      </form>

      {settings.audio?.enabled && (
        <MiniAudioPlayer
          audioSettings={settings.audio}
          themePreset={themePreset}
          formSubmitted={false}
        />
      )}

      {enforce && warn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="warn-title" aria-describedby="warn-desc">
          <div className="nb-panel nb-panel-strong nb-shadow w-full max-w-md bg-orange p-6 text-ink">
            <h2 id="warn-title" className="font-display text-2xl font-bold">Kamu meninggalkan halaman ini</h2>
            <p id="warn-desc" className="mt-4 leading-relaxed">
              Form ini tidak mengizinkan berpindah tab atau meminimalkan jendela. Pelanggaran dicatat. Total saat ini: {vCount} kali.
            </p>
            <button ref={okRef} type="button" onClick={() => setWarn(false)} className="nb-btn nb-btn-ink mt-6">Mengerti, lanjutkan</button>
          </div>
        </div>
      )}
    </>
  );
}

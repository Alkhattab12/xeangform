"use client";

import { useState } from "react";

type FieldKey = "name" | "email" | "topic" | "rating" | "consent";
type Errors = Partial<Record<FieldKey, string>>;

const TOPICS = ["Pendaftaran acara", "Riset & survei", "Umpan balik", "Formulir kontak"];
const ORDER: FieldKey[] = ["name", "email", "topic", "rating", "consent"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [rating, setRating] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Isi nama minimal 2 karakter.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Masukkan alamat email yang valid, contoh: nama@email.com.";
    if (!topic) e.topic = "Pilih salah satu jenis form.";
    if (!rating) e.rating = "Beri penilaian 1 sampai 5.";
    if (!consent) e.consent = "Centang persetujuan untuk melanjutkan.";
    return e;
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (status === "submitting") return; // cegah kirim ganda
    const e = validate();
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) {
      document.getElementById(`demo-${first}`)?.focus();
      return;
    }
    setStatus("submitting");
    window.setTimeout(() => setStatus("done"), 600);
  }

  function reset() {
    setName(""); setEmail(""); setTopic(""); setRating(""); setConsent(false);
    setErrors({}); setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="nb-panel nb-panel-strong nb-shadow bg-accent p-8 text-ink" role="status">
        <p className="nb-mono mb-3">Berhasil / demo</p>
        <h3 className="text-4xl font-bold">Terima kasih, {name.trim()}!</h3>
        <p className="mt-4 leading-relaxed">
          Ini hanya demo: jawabanmu tidak dikirim atau disimpan ke mana pun. Di form sungguhan, jawaban baru dinyatakan
          berhasil setelah tersimpan di database.
        </p>
        <button type="button" onClick={reset} className="nb-btn nb-btn-ink mt-6">
          Coba lagi
        </button>
      </div>
    );
  }

  const err = (k: FieldKey) =>
    errors[k] ? (
      <p id={`demo-${k}-error`} role="alert" className="mt-2 font-bold text-[#c62f00] dark:text-orange">
        {errors[k]}
      </p>
    ) : null;
  const inv = (k: FieldKey) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `demo-${k}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="nb-panel nb-panel-strong nb-shadow space-y-7 p-6 sm:p-8">
      <p className="nb-mono">Contoh form / FORM-DEMO</p>

      <div>
        <label htmlFor="demo-name" className="mb-2 block font-display font-bold">
          Nama lengkap <span aria-hidden="true">*</span>
        </label>
        <input id="demo-name" className="nb-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" {...inv("name")} />
        {err("name")}
      </div>

      <div>
        <label htmlFor="demo-email" className="mb-2 block font-display font-bold">
          Email <span aria-hidden="true">*</span>
        </label>
        <input id="demo-email" type="email" inputMode="email" className="nb-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" {...inv("email")} />
        {err("email")}
      </div>

      <div>
        <label htmlFor="demo-topic" className="mb-2 block font-display font-bold">
          Form apa yang ingin kamu buat? <span aria-hidden="true">*</span>
        </label>
        <select id="demo-topic" className="nb-input" value={topic} onChange={(e) => setTopic(e.target.value)} {...inv("topic")}>
          <option value="">Pilih salah satu…</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {err("topic")}
      </div>

      <fieldset {...inv("rating")}>
        <legend className="mb-2 font-display font-bold">
          Seberapa menarik tampilannya? <span aria-hidden="true">*</span>
        </legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="relative">
              <input
                id={n === 1 ? "demo-rating" : `demo-rating-${n}`}
                type="radio"
                name="rating"
                value={String(n)}
                checked={rating === String(n)}
                onChange={(e) => setRating(e.target.value)}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <label
                htmlFor={n === 1 ? "demo-rating" : `demo-rating-${n}`}
                className="flex h-12 w-12 items-center justify-center border-2 border-line bg-surface font-display font-bold peer-checked:bg-accent peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cobalt"
              >
                {n}
              </label>
            </div>
          ))}
        </div>
        {err("rating")}
      </fieldset>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="demo-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#3457ff]"
            {...inv("consent")}
          />
          <span>Saya paham ini hanya demo dan datanya tidak disimpan.</span>
        </label>
        {err("consent")}
      </div>

      <button type="submit" className="nb-btn" disabled={status === "submitting"}>
        {status === "submitting" ? "Mengirim…" : "Kirim jawaban"}
      </button>
    </form>
  );
}

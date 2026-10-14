"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  /** Tombol tampilkan/sembunyikan. Default: aktif untuk type="password". */
  revealable?: boolean;
};

export function AuthField({ id, label, type = "text", autoComplete, defaultValue, hint, error, revealable }: Props) {
  const [shown, setShown] = useState(false);
  const canReveal = (revealable ?? type === "password") && type === "password";
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-display font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={canReveal && shown ? "text" : type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          className={`nb-input ${canReveal ? "pr-12" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          // Cegah koreksi otomatis/kapitalisasi pada kolom sandi saat dibuka
          autoCapitalize={type === "password" ? "none" : undefined}
          spellCheck={type === "password" ? false : undefined}
        />
        {canReveal && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
            aria-pressed={shown}
            className="absolute right-0 top-0 inline-flex h-full w-11 items-center justify-center text-fg hover:text-cobalt"
          >
            {shown ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="nb-mono mt-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 font-bold text-[#c62f00] dark:text-orange">
          {error}
        </p>
      )}
    </div>
  );
}

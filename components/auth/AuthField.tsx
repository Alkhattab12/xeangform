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
  placeholder?: string;
  required?: boolean;
};

export function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  error,
  placeholder,
  required,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="block font-display font-bold">
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink/75 hover:text-ink focus-visible:outline-none focus-visible:underline"
            tabIndex={-1}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Perlihatkan kata sandi"}
          >
            {showPassword ? (
              <>
                <EyeOff size={15} />
                <span>Sembunyikan</span>
              </>
            ) : (
              <>
                <Eye size={15} />
                <span>Perlihatkan</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={actualType}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="nb-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
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

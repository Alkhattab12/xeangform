type Props = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
};

export function AuthField({ id, label, type = "text", autoComplete, defaultValue, hint, error }: Props) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-display font-bold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="nb-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
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

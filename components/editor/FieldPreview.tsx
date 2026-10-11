import type { FormField } from "@/lib/forms/schema";

function Control({ field }: { field: FormField }) {
  const ph = field.placeholder || undefined;
  switch (field.type) {
    case "short_text":
      return <input disabled className="nb-input" placeholder={ph ?? "Jawaban singkat"} />;
    case "email":
      return <input disabled type="email" className="nb-input" placeholder={ph ?? "nama@email.com"} />;
    case "phone":
      return <input disabled type="tel" className="nb-input" placeholder={ph ?? "08xx xxxx xxxx"} />;
    case "number":
      return <input disabled type="number" className="nb-input" placeholder={ph ?? "0"} />;
    case "url":
      return <input disabled type="url" className="nb-input" placeholder={ph ?? "https://"} />;
    case "date":
      return <input disabled type="date" className="nb-input" />;
    case "time":
      return <input disabled type="time" className="nb-input" />;
    case "long_text":
      return <textarea disabled rows={3} className="nb-input" placeholder={ph ?? "Jawaban panjang"} />;
    case "radio":
    case "checkbox":
      return (
        <ul className="space-y-2">
          {(field.options ?? []).map((o) => (
            <li key={o.id}>
              <label className="flex items-center gap-3">
                <input disabled type={field.type === "radio" ? "radio" : "checkbox"} className="h-5 w-5" />
                {o.label || <span className="opacity-60">Opsi kosong</span>}
              </label>
            </li>
          ))}
          {field.allowOther && (
            <li className="flex items-center gap-3">
              <input disabled type={field.type === "radio" ? "radio" : "checkbox"} className="h-5 w-5" />
              <span className="opacity-70">Lainnya…</span>
            </li>
          )}
        </ul>
      );
    case "dropdown":
      return (
        <select disabled className="nb-input">
          <option>Pilih salah satu…</option>
        </select>
      );
    case "linear_scale": {
      const s = field.scale ?? { min: 1, max: 5 };
      const nums = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);
      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {nums.map((n) => (
              <span key={n} className="flex h-10 w-10 items-center justify-center border-2 border-line font-display font-bold">
                {n}
              </span>
            ))}
          </div>
          {(s.minLabel || s.maxLabel) && (
            <p className="nb-mono mt-2 flex justify-between gap-4">
              <span>{s.minLabel}</span>
              <span>{s.maxLabel}</span>
            </p>
          )}
        </div>
      );
    }
    case "rating":
      return (
        <div className="flex gap-1 text-3xl leading-none">
          {Array.from({ length: field.ratingMax ?? 5 }, (_, i) => (
            <span key={i}>☆</span>
          ))}
        </div>
      );
    case "file": {
      const f = field.file;
      return (
        <div className="border-2 border-dashed border-line p-4 text-center">
          <p className="font-bold">Seret file ke sini atau pilih dari perangkat</p>
          {f && (
            <p className="nb-mono mt-2">
              {f.accept.join(" / ") || "Belum ada tipe"} · maks {f.maxSizeMb} MB · {f.maxFiles} file
            </p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

export function FieldPreview({ field }: { field: FormField }) {
  if (field.type === "page_break") {
    return (
      <div className="border-y-[3px] border-dashed border-line py-3 text-center">
        <p className="nb-mono">— Halaman baru —</p>
        {field.label && <p className="mt-1 font-display text-xl font-bold">{field.label}</p>}
        {field.description && <p className="mt-1 text-sm">{field.description}</p>}
      </div>
    );
  }
  if (field.type === "divider") return <hr className="border-t-[3px] border-line" />;
  if (field.type === "section") {
    return (
      <div>
        <h3 className="font-display text-2xl font-bold">{field.label || "Judul bagian"}</h3>
        {field.description && <p className="mt-1">{field.description}</p>}
      </div>
    );
  }
  if (field.type === "paragraph") {
    return <p className="whitespace-pre-wrap leading-relaxed">{field.label || "Teks informasi"}</p>;
  }
  if (field.type === "consent") {
    return (
      <label className="flex items-start gap-3">
        <input disabled type="checkbox" className="mt-1 h-5 w-5 shrink-0" />
        <span>
          {field.label || "Teks persetujuan"}
          {field.required && <span aria-hidden="true"> *</span>}
        </span>
      </label>
    );
  }
  return (
    <div>
      <p className="font-display font-bold">
        {field.label || <span className="opacity-60">Pertanyaan tanpa judul</span>}
        {field.required && <span aria-hidden="true"> *</span>}
      </p>
      {field.description && <p className="mt-1 text-sm">{field.description}</p>}
      <div className="mt-3">
        <Control field={field} />
      </div>
    </div>
  );
}

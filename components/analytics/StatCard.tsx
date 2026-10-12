type Props = { label: string; value: string; hint?: string; tone?: string; lines?: string[] };

/** Kartu ringkasan. `value` sudah berupa teks terformat (mis. "Belum ada data" untuk penyebut nol). */
export function StatCard({ label, value, hint, tone = "", lines }: Props) {
  return (
    <div className={`nb-panel nb-panel-strong p-5 ${tone}`}>
      <p className="nb-mono">{label}</p>
      <p className="mt-3 break-words font-display text-4xl font-bold leading-none sm:text-5xl">{value}</p>
      {lines && lines.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-sm">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {hint && <p className="mt-2 text-sm opacity-80">{hint}</p>}
    </div>
  );
}

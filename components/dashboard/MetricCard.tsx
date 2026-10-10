type Props = { label: string; value: number | null; tone?: string };

/** value === null berarti GAGAL memuat (beda dengan 0 = benar-benar kosong). */
export function MetricCard({ label, value, tone = "" }: Props) {
  return (
    <div className={`nb-panel nb-panel-strong p-5 ${tone}`}>
      <p className="nb-mono">{label}</p>
      {value === null ? (
        <>
          <p className="mt-4 font-display text-5xl font-bold leading-none" aria-hidden="true">—</p>
          <p role="alert" className="mt-2 text-sm font-bold">Gagal memuat data.</p>
        </>
      ) : (
        <p className="mt-4 font-display text-6xl font-bold leading-none">{value}</p>
      )}
    </div>
  );
}

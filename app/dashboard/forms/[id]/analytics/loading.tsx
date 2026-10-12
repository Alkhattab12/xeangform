/** Kerangka saat analitik dimuat (Next menampilkannya otomatis selama server menghitung). */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10" aria-busy="true" aria-label="Memuat analitik">
      <div className="h-4 w-48 animate-pulse bg-line/20" />
      <div className="mt-6 h-12 w-2/3 animate-pulse bg-line/20" />
      <div className="nb-panel nb-panel-strong mt-6 h-40 animate-pulse" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nb-panel nb-panel-strong h-36 animate-pulse" />
        ))}
      </div>
      <div className="nb-panel nb-panel-strong mt-12 h-72 animate-pulse" />
      <div className="nb-panel nb-panel-strong mt-8 h-72 animate-pulse" />
      <p className="sr-only" role="status">Memuat analitik…</p>
    </main>
  );
}

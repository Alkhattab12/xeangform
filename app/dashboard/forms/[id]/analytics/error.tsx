"use client";

export default function AnalyticsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div role="alert" className="nb-panel nb-panel-strong border-[3px] bg-orange p-6 text-ink">
        <h1 className="font-display text-3xl font-bold">Analitik gagal dimuat</h1>
        <p className="mt-2">Terjadi kesalahan saat menghitung atau mengambil data. Data kamu tidak berubah. Coba lagi sebentar lagi.</p>
        <button type="button" onClick={reset} className="nb-btn mt-4">Coba lagi</button>
      </div>
    </main>
  );
}

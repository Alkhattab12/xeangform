import Link from "next/link";

const templates = [
  { no: "A", name: "Pendaftaran", desc: "Data peserta, pilihan sesi, dan persetujuan.", bg: "bg-accent text-ink" },
  { no: "B", name: "Kuesioner riset", desc: "Skala linear, pilihan ganda, dan jawaban terbuka.", bg: "bg-surface" },
  { no: "C", name: "Umpan balik", desc: "Rating bintang dan saran singkat.", bg: "bg-orange text-ink" },
  { no: "D", name: "Kehadiran acara", desc: "Konfirmasi hadir, jumlah tamu, dan kebutuhan khusus.", bg: "bg-surface" },
  { no: "E", name: "Formulir kontak", desc: "Nama, email, pesan, dan lampiran opsional.", bg: "bg-lavender text-ink" },
  { no: "F", name: "Kuis & survei", desc: "Pertanyaan cepat dengan alur bagian-bagian.", bg: "bg-surface" },
];

export function Templates() {
  return (
    <section id="template" className="border-b-[3px] border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="nb-mono mb-3">04 / Contoh &amp; template</p>
        <h2 className="max-w-3xl font-display text-[clamp(2.25rem,7vw,4.5rem)] font-bold">Mulai dari template, ubah sesukamu.</h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t.no}>
              <Link
                href="/daftar"
                className={`nb-panel nb-panel-strong flex h-full flex-col justify-between gap-10 p-6 transition-transform duration-150 hover:-translate-y-1 ${t.bg}`}
              >
                <span className="nb-mono">Template / {t.no}</span>
                <span>
                  <span className="block font-display text-3xl font-bold">{t.name}</span>
                  <span className="mt-2 block leading-relaxed">{t.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

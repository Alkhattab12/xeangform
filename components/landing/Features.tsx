const features = [
  { no: "01", title: "Builder drag-and-drop", desc: "Tambah, urutkan, dan atur 18 jenis kolom dengan seret dan lepas. Ubah pengaturan tiap kolom dari panel samping.", tone: "" },
  { no: "02", title: "Tema & tata letak kustom", desc: "Pilih preset, atur warna, huruf, ketebalan garis, dan bayangan. Tampilan form publik ikut berubah.", tone: "bg-accent text-ink" },
  { no: "03", title: "Respons langsung tersimpan", desc: "Setiap jawaban yang valid disimpan ke database dan bisa dibuka lagi dari perangkat mana pun.", tone: "" },
  { no: "04", title: "Lampiran file", desc: "Terima PDF, gambar, dan dokumen dengan batas tipe serta ukuran. File disimpan privat dan hanya bisa diunduh pemilik form.", tone: "bg-lavender text-ink" },
  { no: "05", title: "Analitik & ekspor", desc: "Lihat grafik jawaban, lalu unduh data sebagai CSV, XLSX, atau JSON untuk dianalisis lebih lanjut.", tone: "" },
  { no: "06", title: "Tautan publik", desc: "Publikasikan form dengan satu tombol dan bagikan tautan unik. Tarik kembali kapan saja.", tone: "" },
];

export function Features() {
  return (
    <section id="fitur" className="border-b-[3px] border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="nb-mono mb-3">02 / Fitur</p>
        <h2 className="max-w-3xl font-display text-[clamp(2.25rem,7vw,4.5rem)] font-bold">
          Semua yang kamu butuhkan untuk mengumpulkan jawaban.
        </h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.no} className={`nb-panel nb-panel-strong p-6 ${f.tone}`}>
              <span className="font-display text-6xl font-bold leading-none">{f.no}</span>
              <h3 className="mt-6 text-2xl font-bold">{f.title}</h3>
              <p className="mt-3 leading-relaxed">{f.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

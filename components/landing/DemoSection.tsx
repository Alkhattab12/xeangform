import { DemoForm } from "./DemoForm";

export function DemoSection() {
  return (
    <section id="demo" className="border-b-[3px] border-line bg-lavender text-ink">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="nb-mono mb-3">03 / Coba langsung</p>
          <h2 className="font-display text-[clamp(2.25rem,7vw,4.5rem)] font-bold">Isi dulu, daftar belakangan.</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed">
            Ini contoh pengalaman responden: validasi jelas, jawaban tidak hilang saat ada yang salah, dan konfirmasi saat
            selesai. Coba kirim dengan kolom kosong.
          </p>
        </div>
        <div className="text-fg lg:col-span-7">
          <DemoForm />
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Starburst } from "@/components/brand/Shapes";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-[3px] border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-7">
          <p className="nb-mono mb-6">Collect ideas / Build connections / 001</p>
          <h1 className="font-display text-[clamp(3.25rem,13vw,8rem)] font-bold">
            Forms with{" "}
            <span className="inline-block -rotate-2 bg-accent px-3 text-ink">Character.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed">
            Syamil Form membantu kamu membuat formulir online yang rapi sekaligus punya kepribadian. Susun pertanyaan,
            bagikan tautannya, kumpulkan jawaban dan file, lalu baca hasilnya — semua di satu tempat.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/daftar" className="nb-btn">
              Buat Form Pertama
            </Link>
            <a href="#demo" className="nb-btn nb-btn-ghost">
              Lihat Contoh Form
            </a>
          </div>
        </div>

        {/* Komposisi abstrak + pratinjau editor & form responden (dekoratif) */}
        <div className="relative mx-auto h-[440px] w-full max-w-md lg:col-span-5" aria-hidden="true">
          <div className="absolute left-0 top-12 h-64 w-64 -rotate-6 border-[3px] border-line bg-lavender" />
          <div className="absolute -right-2 -top-4 h-28 w-28 rotate-12">
            <Starburst className="h-full w-full fill-orange stroke-line" />
          </div>
          <div className="absolute bottom-10 left-0 h-20 w-20 rounded-full border-[3px] border-line" />

          <div className="nb-panel nb-shadow absolute left-6 top-4 w-[78%] -rotate-2 p-3">
            <p className="nb-mono mb-3 flex justify-between">
              <span>Editor</span>
              <span>FORM-0A7F</span>
            </p>
            <div className="space-y-2">
              <div className="border-2 border-line p-2">
                <div className="h-2 w-2/3 bg-fg" />
                <div className="mt-2 h-6 border-2 border-line bg-bg" />
              </div>
              <div className="border-2 border-line p-2 outline outline-[3px] outline-offset-2 outline-cobalt">
                <div className="h-2 w-1/2 bg-fg" />
                <div className="mt-2 flex gap-2">
                  <div className="h-5 w-5 rounded-full border-2 border-line bg-accent" />
                  <div className="h-5 w-5 rounded-full border-2 border-line" />
                  <div className="h-5 w-5 rounded-full border-2 border-line" />
                </div>
              </div>
              <div className="border-2 border-line p-2">
                <div className="h-2 w-1/3 bg-fg" />
                <div className="mt-2 h-6 border-2 border-line bg-bg" />
              </div>
            </div>
          </div>

          <div className="nb-panel nb-panel-strong nb-shadow absolute bottom-0 right-0 w-[68%] rotate-2 bg-accent p-4 text-ink">
            <p className="nb-mono mb-2">Responden</p>
            <div className="mb-3 h-8 border-2 border-ink bg-white" />
            <div className="inline-block border-2 border-ink bg-ink px-4 py-2 font-display text-sm font-bold text-white">
              Kirim →
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

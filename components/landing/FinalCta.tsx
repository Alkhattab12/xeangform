import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-accent text-ink">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <p className="nb-mono mb-4">05 / Giliranmu</p>
        <h2 className="font-display text-[clamp(2.5rem,9vw,6rem)] font-bold">Formulir Biasa, Ide Luar Biasa.</h2>
        <Link href="/daftar" className="nb-btn nb-btn-ink mt-10">
          Buat Form Pertama
        </Link>
      </div>
    </section>
  );
}

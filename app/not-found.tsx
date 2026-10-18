import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Halaman tidak ditemukan" };

/** 404 global untuk semua rute (form publik yang tidak ada punya penanganan sendiri di /f/[slug]). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <Link href="/" aria-label="Syamil Form, kembali ke beranda">
        <Logo />
      </Link>
      <section className="nb-panel w-full p-6 sm:p-10">
        <p className="nb-mono">Kode 404</p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl">Halaman tidak ketemu.</h1>
        <p className="mt-5 leading-relaxed">Alamat yang kamu buka tidak ada, sudah dipindahkan, atau form yang kamu cari belum diterbitkan.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="nb-btn">Kembali ke beranda</Link>
          <Link href="/dashboard" className="nb-btn nb-btn-ghost">Buka dashboard</Link>
        </div>
      </section>
    </main>
  );
}

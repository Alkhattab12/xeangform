"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";

/**
 * Batas error global (mis. database tidak terjangkau saat membuka form). Pesan sengaja generik: detail error server
 * tidak dikirim ke browser di produksi; hanya `digest` (kode acak) yang bisa dicocokkan dengan log server.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = "Ada kendala · Syamil Form"; // generateMetadata ikut gagal saat error, jadi tab tidak punya judul
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <Link href="/" aria-label="Syamil Form, kembali ke beranda">
        <Logo />
      </Link>
      <section role="alert" className="nb-panel w-full p-6 sm:p-10">
        <p className="nb-mono">Ada kendala</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">Layanan sedang bermasalah.</h1>
        <p className="mt-5 leading-relaxed">Halaman ini tidak bisa dimuat sekarang. Coba lagi sebentar lagi. Jika kamu sedang mengisi form, pastikan jawabanmu terkirim sebelum menutup halaman.</p>
        {error.digest && <p className="nb-mono mt-4 normal-case tracking-normal">Kode: {error.digest}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="nb-btn">Coba lagi</button>
          <Link href="/" className="nb-btn nb-btn-ghost">Kembali ke beranda</Link>
        </div>
      </section>
    </main>
  );
}

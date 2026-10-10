import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function FormNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <Logo />
      <div className="nb-panel nb-panel-strong nb-shadow p-8">
        <p className="nb-mono mb-3">Error / 404</p>
        <h1 className="font-display text-4xl font-bold">Form tidak tersedia.</h1>
        <p className="mt-4 leading-relaxed">
          Tautan ini mungkin salah, atau pembuat form sudah menutup form ini. Hubungi pembuatnya jika kamu merasa ini keliru.
        </p>
        <Link href="/" className="nb-btn mt-6">Ke beranda</Link>
      </div>
    </main>
  );
}

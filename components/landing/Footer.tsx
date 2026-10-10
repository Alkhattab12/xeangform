import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t-[3px] border-line bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs">Forms with Character. Platform form online berbahasa Indonesia.</p>
        </div>
        <nav aria-label="Navigasi footer">
          <p className="nb-mono mb-3">Produk</p>
          <ul className="space-y-2 font-bold">
            <li><a href="#fitur" className="hover:underline">Fitur</a></li>
            <li><a href="#demo" className="hover:underline">Demo</a></li>
            <li><a href="#template" className="hover:underline">Template</a></li>
          </ul>
          <p className="nb-mono mb-3 mt-6">Dokumentasi</p>
          <ul className="space-y-2">
            <li>Panduan — segera hadir</li>
            <li>Referensi API — segera hadir</li>
          </ul>
        </nav>
        <div>
          <p className="nb-mono mb-3">Privasi</p>
          <p className="leading-relaxed">
            Jawaban responden hanya dapat diakses pemilik form. Kamu bisa menghapus respons atau form kapan saja.
            Halaman kebijakan privasi lengkap akan tersedia sebelum peluncuran.
          </p>
        </div>
      </div>
      <p className="nb-mono border-t-2 border-line px-5 py-4 text-center">© {new Date().getFullYear()} Syamil Form</p>
    </footer>
  );
}

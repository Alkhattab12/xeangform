import Link from "next/link";

type Props = {
  kind: "login" | "done" | "blocked";
  slug: string;
  title: string;
  score?: { correct: number; total: number } | null;
  violationCount?: number;
  maxViolations?: number;
};

/** Kartu pemberitahuan di halaman publik: wajib login, formulir sudah dikerjakan, atau diblokir anti-cheating. */
export function GateCard({ kind, slug, title, score, violationCount, maxViolations = 3 }: Props) {
  if (kind === "login") {
    const next = encodeURIComponent(`/f/${slug}`);
    return (
      <div className="nb-panel nb-panel-strong nb-shadow p-6 sm:p-8">
        <p className="nb-mono mb-3">Akun diperlukan</p>
        <h1 className="break-words font-display text-4xl font-bold">{title}</h1>
        <p className="mt-5 leading-relaxed">
          Form ini hanya bisa diisi satu kali untuk setiap akun. Masuk atau daftar dulu untuk mulai mengisi. Pembuat form dapat melihat email akun yang mengisi.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href={`/masuk?next=${next}`} className="nb-btn">Masuk</Link>
          <Link href={`/daftar?next=${next}`} className="nb-btn nb-btn-ghost">Daftar</Link>
        </div>
      </div>
    );
  }

  if (kind === "blocked") {
    return (
      <div role="alert" className="nb-panel nb-panel-strong nb-shadow bg-[#c62f00] text-white p-6 sm:p-8 border-4 border-ink">
        <p className="nb-mono mb-3 uppercase tracking-wider text-white/90">Sesi Dihentikan / Pelanggaran Keamanan</p>
        <h1 className="break-words font-display text-3xl sm:text-4xl font-bold">
          SESI DIHENTIKAN — BATAS PELANGGARAN TERCAPAI
        </h1>
        <p className="mt-5 leading-relaxed text-white/95">
          Anda telah mencapai batas {violationCount ?? maxViolations}/{maxViolations} pelanggaran yang ditetapkan oleh pembuat form pada &quot;{title}&quot;. Sesi pengerjaan Anda dihentikan secara otomatis dan akses ke percobaan ini telah diblokir.
        </p>
        <div className="mt-6 border-t border-white/20 pt-4 text-sm leading-relaxed text-white/80">
          Sistem telah mencatat riwayat kejadian dan memberitahukan pemilik form. Periksa instruksi dari penyelenggara apabila Anda merasa terjadi kesalahan atau membutuhkan peninjauan.
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="nb-panel nb-panel-strong nb-shadow bg-accent p-6 text-[color:var(--on-accent)] sm:p-8">
      <p className="nb-mono mb-3">Sudah selesai</p>
      <h1 className="break-words font-display text-4xl font-bold">Formulir sudah selesai dikerjakan.</h1>
      <p className="mt-5 leading-relaxed">
        Akun kamu sudah mengisi &quot;{title}&quot;. Setiap akun hanya dapat mengisi satu kali, jadi pengisian ulang tidak tersedia.
      </p>
      {score && score.total > 0 && (
        <p className="mt-6 font-display text-3xl font-bold">Benar {score.correct} dari {score.total} soal</p>
      )}
    </div>
  );
}

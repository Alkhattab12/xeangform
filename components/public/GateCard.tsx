import Link from "next/link";

type Props = {
  kind: "login" | "done";
  slug: string;
  title: string;
  score?: { correct: number; total: number } | null;
};

/** Kartu pemberitahuan di halaman publik: wajib login, atau formulir sudah dikerjakan. */
export function GateCard({ kind, slug, title, score }: Props) {
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

import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResendForm } from "@/components/auth/forms";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth/pending";
import { isEmailVerified } from "@/lib/auth/verified";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Cek email" };
export const dynamic = "force-dynamic";

const PROBLEMS: Record<string, string> = {
  layanan: "Layanan autentikasi sedang bermasalah, bukan tautanmu. Coba buka tautan itu lagi beberapa saat lagi.",
  kedaluwarsa: "Tautan konfirmasi sudah kedaluwarsa. Kirim ulang di bawah untuk mendapatkan tautan baru.",
  kode: "Tautan dibuka di browser atau perangkat yang berbeda dari tempat kamu mendaftar. Jika email sudah dikonfirmasi, kamu bisa langsung masuk.",
  tautan: "Tautan tidak valid atau sudah dipakai. Jika email sudah dikonfirmasi, kamu bisa langsung masuk. Jika belum, kirim ulang di bawah.",
};

export default async function CekEmailPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sudah login dan terverifikasi: tidak ada yang perlu dikonfirmasi lagi
  if (user && isEmailVerified(user)) redirect(next);

  const jar = await cookies();
  const email = jar.get(PENDING_EMAIL_COOKIE)?.value || user?.email || undefined;
  const problem = sp.error ? PROBLEMS[sp.error] : undefined;

  return (
    <AuthShell
      title="Cek email kamu"
      subtitle="Satu langkah lagi: konfirmasi email supaya akunmu aktif."
      footer={
        <>
          <p>
            Sudah konfirmasi?{" "}
            <Link href={`/masuk?next=${encodeURIComponent(next)}`} className="underline underline-offset-4">Masuk</Link>
          </p>
          <p className="mt-2">
            Salah email?{" "}
            <Link href="/daftar" className="underline underline-offset-4">Daftar ulang</Link>
          </p>
        </>
      }
    >
      <div className="space-y-6">
        {problem && (
          <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">
            {problem}
          </div>
        )}

        {email ? (
          <div className="nb-panel nb-shadow border-[3px] p-4">
            <p className="nb-mono">Tautan dikirim ke</p>
            <p className="mt-1 break-all font-display text-xl font-bold">{email}</p>
          </div>
        ) : null}

        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Buka email itu dan klik tautan konfirmasi. Kamu tidak bisa masuk sebelum email dikonfirmasi.</li>
          <li>Belum masuk? Periksa folder <strong>spam</strong> atau <strong>promosi</strong>.</li>
          <li>Email bisa terlambat beberapa menit. Tunggu sebentar sebelum meminta yang baru.</li>
        </ul>

        <ResendForm email={email} next={next} />
      </div>
    </AuthShell>
  );
}

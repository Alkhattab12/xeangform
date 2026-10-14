import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Masuk" };

const LINK_MESSAGES: Record<string, string> = {
  layanan: "Layanan autentikasi sedang bermasalah, bukan tautanmu. Coba buka tautan itu lagi beberapa saat lagi.",
  tautan: "Tautan tidak valid atau sudah dipakai. Jika email sudah dikonfirmasi, masuk saja dengan kata sandimu.",
  kedaluwarsa: "Tautan sudah kedaluwarsa. Masuk untuk meminta tautan konfirmasi yang baru.",
  kode: "Tautan dibuka di browser atau perangkat yang berbeda dari tempat kamu mendaftar, jadi sesi tidak bisa dibuka otomatis. Jika email sudah dikonfirmasi, masuk dengan email dan kata sandimu.",
};

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Masuk"
      subtitle="Lanjutkan ke form dan respons kamu."
      footer={
        <>
          <p>
            Belum punya akun?{" "}
            <Link href={sp.next ? `/daftar?next=${encodeURIComponent(sp.next)}` : "/daftar"} className="underline underline-offset-4">Daftar gratis</Link>
          </p>
          <p className="mt-2">
            <Link href="/lupa-password" className="underline underline-offset-4">Lupa kata sandi?</Link>
          </p>
        </>
      }
    >
      <LoginForm next={sp.next ? safeNext(sp.next) : undefined} linkMessage={sp.error ? LINK_MESSAGES[sp.error] : undefined} />
    </AuthShell>
  );
}

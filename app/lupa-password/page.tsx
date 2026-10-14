import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default async function LupaPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Lupa kata sandi"
      subtitle="Masukkan email akunmu. Kami kirim tautan untuk mengaturnya ulang."
      footer={
        <p>
          <Link href="/masuk" className="underline underline-offset-4">← Kembali ke halaman masuk</Link>
        </p>
      }
    >
      <ForgotForm linkMessage={
          sp.error === "layanan"
            ? "Layanan autentikasi sedang bermasalah. Coba buka tautan reset itu lagi beberapa saat lagi."
            : sp.error
              ? "Tautan reset tidak valid atau sudah kedaluwarsa. Masukkan email lagi untuk meminta tautan baru."
              : undefined
        } />
    </AuthShell>
  );
}

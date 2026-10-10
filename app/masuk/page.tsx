import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Masuk" };

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
            <Link href="/daftar" className="underline underline-offset-4">Daftar gratis</Link>
          </p>
          <p className="mt-2">
            <Link href="/lupa-password" className="underline underline-offset-4">Lupa kata sandi?</Link>
          </p>
        </>
      }
    >
      <LoginForm next={sp.next} linkError={sp.error === "tautan"} />
    </AuthShell>
  );
}

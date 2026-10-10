import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Daftar" };

export default async function DaftarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ? safeNext(sp.next) : undefined;
  return (
    <AuthShell
      title="Daftar"
      subtitle="Buat akun untuk melanjutkan."
      footer={
        <p>
          Sudah punya akun?{" "}
          <Link href={next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk"} className="underline underline-offset-4">Masuk</Link>
        </p>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}

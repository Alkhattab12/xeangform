import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <AuthShell
      title="Daftar"
      subtitle="Buat akun dan mulai bikin form pertamamu."
      footer={
        <p>
          Sudah punya akun? <Link href="/masuk" className="underline underline-offset-4">Masuk</Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}

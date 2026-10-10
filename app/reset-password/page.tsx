import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default async function ResetPasswordPage() {
  const session = await getSessionUser();

  if (!session) {
    return (
      <AuthShell
        title="Tautan tidak valid"
        subtitle="Tautan reset sudah kedaluwarsa atau sudah dipakai."
        footer={
          <Link href="/lupa-password" className="underline underline-offset-4">Minta tautan baru</Link>
        }
      >
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">
          Kami tidak menemukan sesi reset yang aktif.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Kata sandi baru" subtitle="Pilih kata sandi baru untuk akunmu.">
      <ResetForm />
    </AuthShell>
  );
}

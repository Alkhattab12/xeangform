import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { isEmailVerified } from "@/lib/auth/verified";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

// Judul netral: judul tab TIDAK boleh mengklaim sukses sebelum backend mengonfirmasi (isi halaman yang menentukan)
export const metadata: Metadata = { title: "Verifikasi email" };
export const dynamic = "force-dynamic";

export default async function TerverifikasiPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Halaman sukses HANYA tampil jika backend benar-benar menyatakan email terverifikasi
  if (!user || !isEmailVerified(user)) {
    return (
      <AuthShell
        title="Belum terverifikasi"
        subtitle="Kami belum bisa memastikan email kamu sudah dikonfirmasi."
        footer={
          <p>
            <Link href="/cek-email" className="underline underline-offset-4">Kirim ulang email konfirmasi</Link>
          </p>
        }
      >
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">
          Jika kamu sudah mengklik tautan konfirmasi, silakan masuk dengan email dan kata sandimu.
        </div>
        <Link href="/masuk" className="nb-btn mt-6 w-full">Masuk</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Email terverifikasi" subtitle="Akunmu sudah aktif. Kamu tidak perlu mengonfirmasi lagi saat masuk di lain waktu.">
      <div role="status" className="nb-panel nb-shadow flex items-start gap-3 border-[3px] bg-accent p-4 text-ink">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
        <p className="break-all font-bold">{user.email}</p>
      </div>
      <Link href={next} className="nb-btn mt-6 w-full">Lanjut</Link>
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, User, Mail, Shield, Palette } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import {
  ProfileNameForm,
  EmailUpdateForm,
  PasswordChangeForm,
  BackgroundPreferenceCard,
} from "@/components/account/AccountForms";

export const metadata: Metadata = {
  title: "Pengaturan Akun",
  description: "Kelola profil, keamanan akun, dan preferensi background aplikasi.",
};

export default async function AkunPage() {
  const session = await getSessionUser();
  if (!session) redirect("/masuk");

  const isConfirmed = Boolean(session.user.email_confirmed_at || session.user.confirmed_at);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tombol kembali ke dashboard */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold font-display underline-offset-4 hover:underline text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Header Halaman */}
      <div className="mb-8 border-b-[3px] border-line pb-6">
        <span className="nb-mono text-xs uppercase tracking-wider text-ink/70">Manajemen Pengguna</span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Pengaturan Akun</h1>
        <p className="mt-2 text-base text-ink/80">
          Kelola profil publik, keamanan kata sandi, dan preferensi background global Xeangform.
        </p>
      </div>

      <div className="space-y-8">
        {/* Seksi 1: Profil */}
        <section className="nb-panel nb-shadow border-[3px] bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b-[2px] border-line/20 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center border-[2px] border-line bg-accent text-ink">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Profil Akun</h2>
              <p className="text-xs text-ink/75">Ubah nama tampilan yang digunakan di seluruh aplikasi.</p>
            </div>
          </div>
          <ProfileNameForm initialName={session.displayName} />
        </section>

        {/* Seksi 2: Email & Verifikasi */}
        <section className="nb-panel nb-shadow border-[3px] bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b-[2px] border-line/20 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center border-[2px] border-line bg-lime text-ink">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Alamat Email & Status</h2>
              <p className="text-xs text-ink/75">Informasi verifikasi dan mekanisme pembaruan email akun.</p>
            </div>
          </div>
          <EmailUpdateForm currentEmail={session.user.email ?? ""} isConfirmed={isConfirmed} />
        </section>

        {/* Seksi 3: Keamanan & Kata Sandi */}
        <section className="nb-panel nb-shadow border-[3px] bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b-[2px] border-line/20 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center border-[2px] border-line bg-orange text-ink">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Keamanan & Kata Sandi</h2>
              <p className="text-xs text-ink/75">Perbarui kata sandi secara aman tanpa mengekspos kata sandi lama.</p>
            </div>
          </div>
          <PasswordChangeForm />
        </section>

        {/* Seksi 4: Background Animasi Global */}
        <section className="nb-panel nb-shadow border-[3px] bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b-[2px] border-line/20 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center border-[2px] border-line bg-cobalt text-white">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Latar Belakang Global</h2>
              <p className="text-xs text-ink/75">Pilih antara Mode Gerak yang interaktif atau Mode Diam yang tenang.</p>
            </div>
          </div>
          <BackgroundPreferenceCard />
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, KeyRound, Mail, Palette, UserRound } from "lucide-react";
import { EmailForm, PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { BackgroundToggle } from "@/components/background/BackgroundToggle";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Akun" };
export const dynamic = "force-dynamic";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="nb-panel nb-shadow border-[3px] p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 font-display text-2xl font-bold">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-line bg-accent text-ink" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AkunPage({ searchParams }: { searchParams: Promise<{ info?: string }> }) {
  const session = await getSessionUser();
  if (!session) redirect("/masuk?next=%2Fdashboard%2Fakun");
  const sp = await searchParams;
  const { user, displayName } = session;
  const pendingEmail = (user as { new_email?: string }).new_email;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-5 py-8 pb-24">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Akun</h1>
      </div>

      {sp.info === "email" && (
        <div role="status" className="nb-panel border-[3px] bg-accent p-4 font-bold text-ink">
          {pendingEmail
            ? `Konfirmasi diterima. Perubahan ke ${pendingEmail} masih menunggu konfirmasi tambahan; cek kotak masuk email lama dan baru.`
            : "Konfirmasi diterima. Email akunmu sudah diperbarui."}
        </div>
      )}

      <Section icon={<UserRound className="h-5 w-5" />} title="Profil">
        <ProfileForm displayName={displayName} />
      </Section>

      <Section icon={<Mail className="h-5 w-5" />} title="Email">
        <div className="mb-6 space-y-3">
          <div>
            <p className="nb-mono">Email saat ini</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 break-all font-display text-xl font-bold">
              {user.email}
              <span className="nb-mono inline-flex items-center gap-1 border-2 border-line bg-accent px-2 py-1 text-ink">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Terverifikasi
              </span>
            </p>
          </div>
          {pendingEmail && (
            <p role="status" className="nb-panel border-2 bg-orange p-3 font-bold text-ink">
              Menunggu konfirmasi perubahan ke <span className="break-all">{pendingEmail}</span>. Email akunmu belum berubah.
            </p>
          )}
        </div>
        <EmailForm />
      </Section>

      <Section icon={<KeyRound className="h-5 w-5" />} title="Keamanan">
        <p className="mb-5 leading-relaxed">
          Kata sandi tidak pernah ditampilkan. Setelah diubah, perangkat lain akan dikeluarkan dari akunmu.
        </p>
        <PasswordForm />
      </Section>

      <Section icon={<Palette className="h-5 w-5" />} title="Tampilan">
        <p className="mb-5 leading-relaxed">Pilih apakah latar aplikasi bergerak halus atau diam. Pilihanmu tersimpan di perangkat ini.</p>
        <BackgroundToggle variant="full" />
      </Section>
    </main>
  );
}

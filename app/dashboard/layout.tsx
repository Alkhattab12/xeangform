import Link from "next/link";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BackgroundToggle } from "@/components/background/BackgroundToggle";
import { getSessionUser } from "@/lib/auth/session";
import { signOut } from "@/app/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/masuk");

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip min-w-0">
      <header className="border-b-[3px] border-line bg-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/dashboard" aria-label="Syamil Form — dashboard">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <BackgroundToggle />
            <NotificationBell userId={session.user.id} />
            <Link
              href="/dashboard/akun"
              className="nb-btn nb-btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-bold"
              title="Pengaturan Akun & Profil"
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline max-w-[10rem] truncate">{session.displayName}</span>
              <span className="sm:hidden">Akun</span>
            </Link>
            <form action={signOut}>
              <button type="submit" className="nb-btn nb-btn-ghost px-2.5 py-1.5 text-xs sm:text-sm">Keluar</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

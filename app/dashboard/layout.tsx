import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { BackgroundToggle } from "@/components/background/BackgroundToggle";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
            <Logo size={36} wordmarkClassName="hidden min-[420px]:inline" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <BackgroundToggle />
            </div>
            <NotificationBell userId={session.user.id} />
            <Link
              href="/dashboard/akun"
              aria-label="Akun"
              title={session.user.email ?? "Akun"}
              className="nb-btn nb-btn-ghost px-3"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
              <span className="nb-mono hidden max-w-[10rem] truncate sm:inline">{session.displayName}</span>
            </Link>
            <form action={signOut}>
              <button type="submit" className="nb-btn nb-btn-ghost">Keluar</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

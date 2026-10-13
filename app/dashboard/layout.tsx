import Link from "next/link";
import { redirect } from "next/navigation";
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
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell userId={session.user.id} />
            <span className="nb-mono hidden max-w-[16rem] truncate sm:inline" title={session.user.email ?? undefined}>
              {session.displayName}
            </span>
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

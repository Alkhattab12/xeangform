import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BackgroundToggle } from "@/components/background/BackgroundToggle";
import { Starburst } from "@/components/brand/Shapes";

type Props = { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode };

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r-[3px] border-line bg-accent p-10 text-ink lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <Logo />
        <div className="relative">
          <Starburst className="absolute -right-6 -top-24 h-48 w-48 rotate-12 fill-orange stroke-ink" />
          <p className="nb-mono mb-4">Collect ideas / Build connections</p>
          <p className="font-display text-7xl font-bold leading-[0.95]">Forms with Character.</p>
        </div>
        <p className="nb-mono">Syamil Form / 001</p>
      </aside>

      <main className="relative flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <BackgroundToggle />
        </div>
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="Syamil Form — beranda">
            <Logo size={36} />
          </Link>
          <h1 className="font-display text-5xl font-bold">{title}</h1>
          {subtitle && <p className="mt-3 text-lg leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 font-bold">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

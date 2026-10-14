import Link from "next/link";
import { BackgroundToggle } from "@/components/background/BackgroundToggle";
import { Logo } from "@/components/brand/Logo";

const links = [
  { href: "#fitur", label: "Fitur" },
  { href: "#demo", label: "Demo" },
  { href: "#template", label: "Contoh" },
];

export function Nav() {
  return (
    <header className="border-b-[3px] border-line bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" aria-label="Syamil Form — beranda">
          <Logo size={36} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="font-display font-bold underline-offset-4 hover:underline">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <BackgroundToggle />
          <Link href="/masuk" className="hidden px-2 py-2 font-display font-bold underline-offset-4 hover:underline md:inline">
            Masuk
          </Link>
          <Link href="/daftar" className="nb-btn hidden sm:inline-flex">
            Mulai Gratis
          </Link>

          <details className="relative md:hidden">
            <summary className="nb-btn nb-btn-ghost list-none [&::-webkit-details-marker]:hidden">Menu</summary>
            <div className="nb-panel nb-shadow absolute right-0 top-full z-20 mt-3 flex w-56 flex-col gap-1 p-2">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="px-3 py-3 font-display font-bold hover:bg-accent hover:text-ink">
                  {l.label}
                </a>
              ))}
              <Link href="/masuk" className="px-3 py-3 font-display font-bold hover:bg-accent hover:text-ink">
                Masuk
              </Link>
              <Link href="/daftar" className="nb-btn mt-1">
                Mulai Gratis
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

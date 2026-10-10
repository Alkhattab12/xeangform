import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { DemoSection } from "@/components/landing/DemoSection";
import { Templates } from "@/components/landing/Templates";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Lewati ke konten
      </a>
      <Nav />
      <main id="konten">
        <Hero />
        <Features />
        <DemoSection />
        <Templates />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

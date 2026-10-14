import type { Metadata, Viewport } from "next";
import { Fredoka, IBM_Plex_Mono, Inter, Lora, Orbitron, Space_Grotesk } from "next/font/google";
import { BackgroundProvider } from "@/components/background/BackgroundContext";
import { GlobalBackground } from "@/components/background/GlobalBackground";
import { LoadingProvider } from "@/components/ui/LoadingProvider";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });
// Huruf tambahan untuk tema form; tidak di-preload, hanya diunduh jika dipakai.
const rounded = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap", preload: false });
const serif = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const futuristic = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Syamil Form — Forms with Character.", template: "%s · Syamil Form" },
  description: "Buat form online yang berkarakter, kumpulkan respons, terima file, dan analisis datanya.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const fontVars = [display, sans, mono, rounded, serif, futuristic].map((f) => f.variable).join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontVars} data-bg-mode="motion">
      <body>
        <BackgroundProvider>
          <GlobalBackground />
          <LoadingProvider>{children}</LoadingProvider>
        </BackgroundProvider>
      </body>
    </html>
  );
}

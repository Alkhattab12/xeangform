import type { Metadata, Viewport } from "next";
import { Fredoka, IBM_Plex_Mono, Inter, Lora, Orbitron, Space_Grotesk } from "next/font/google";
import { AmbientBackground } from "@/components/background/AmbientBackground";
import { BackgroundProvider } from "@/components/background/BackgroundProvider";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { LoadingProvider } from "@/components/ui/LoadingProvider";
import { BG_INIT_SCRIPT } from "@/lib/background/mode";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });
// Huruf tambahan untuk tema form; tidak di-preload, hanya diunduh jika dipakai.
const rounded = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap", preload: false });
const serif = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const futuristic = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const fontVars = [display, sans, mono, rounded, serif, futuristic].map((f) => f.variable).join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: skrip di <head> menambahkan atribut data-bg-motion sebelum React hydrate
    <html lang="id" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BG_INIT_SCRIPT }} />
      </head>
      <body>
        <BackgroundProvider>
          <AmbientBackground />
          <LoadingProvider>{children}</LoadingProvider>
        </BackgroundProvider>
      </body>
    </html>
  );
}

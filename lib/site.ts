// Identitas situs untuk metadata (OpenGraph/Twitter), halaman 404, dll. Satu tempat agar mudah diganti.
export const SITE_NAME = "Syamil Form";
export const SITE_TAGLINE = "Forms with Character.";
export const SITE_DESCRIPTION = "Buat form online yang berkarakter, kumpulkan respons, terima file, dan analisis datanya.";

/** Domain produksi. Bisa diganti lewat NEXT_PUBLIC_SITE_URL (Vercel env); nilai bawaan = domain resmi saat ini. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://form.xeandigital.web.id").replace(/\/+$/, "");

/** Gambar pratinjau saat tautan dibagikan (1200x630, public/og.png). Harus diulang di setiap openGraph/twitter anak: Next tidak menggabungkannya. */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` };

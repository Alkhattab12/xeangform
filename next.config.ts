import type { NextConfig } from "next";

// Header keamanan. CSP penuh (script-src) sengaja tidak dipasang: Next.js memakai skrip inline dan koneksi ke Supabase/audio eksternal,
// jadi CSP ketat perlu nonce + uji terpisah. Yang dipasang di sini aman dan tidak mengubah perilaku aplikasi.
const common = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];
const csp = (extra = "") => ({ key: "Content-Security-Policy", value: `base-uri 'self'; object-src 'none'${extra}` });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      // Form publik (/f/...) boleh disematkan (iframe) di situs lain; tidak ada X-Frame-Options / frame-ancestors di sini.
      { source: "/f/:path*", headers: [...common, csp()] },
      // Semua rute lain (dashboard, login, akun, dll.) tidak boleh dibingkai situs lain (anti-clickjacking).
      { source: "/((?!f/).*)", headers: [...common, { key: "X-Frame-Options", value: "SAMEORIGIN" }, csp("; frame-ancestors 'self'")] },
    ];
  },
};

export default nextConfig;

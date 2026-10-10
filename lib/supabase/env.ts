// Mendukung nama variabel standar DAN yang dibuat integrasi Vercel–Supabase (prefix XEAN_SUPABASE_).
// Akses ditulis literal supaya Next.js bisa meng-inline variabel NEXT_PUBLIC_*.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_XEAN_SUPABASE_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_XEAN_SUPABASE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_XEAN_SUPABASE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Env Supabase belum diisi: URL project dan anon/publishable key (lihat .env.example).");
  }
  return { url, key };
}

/** Hanya untuk kode server. Jangan pernah dipanggil dari komponen client. */
export function serviceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.XEAN_SUPABASE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.XEAN_SUPABASE_SUPABASE_SECRET_KEY ||
    undefined
  );
}

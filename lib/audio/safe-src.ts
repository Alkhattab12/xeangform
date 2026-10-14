// Validasi sumber audio. Tanpa dependensi server supaya bisa dipakai di editor, pemutar publik, dan server action.

/** Hanya path internal ("/audio/...") atau URL https:// yang boleh dipakai sebagai sumber audio. */
export function isSafeAudioSrc(src: string | undefined | null): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return !src.startsWith("//") && !src.startsWith("/\\");
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

/** Mengembalikan src pertama yang tidak aman (untuk pesan error), atau null jika semua aman. */
export function findUnsafeAudioSrc(audio: { customUrl?: string; playlist?: { src: string }[] }): string | null {
  if (audio.customUrl && !isSafeAudioSrc(audio.customUrl)) return audio.customUrl;
  for (const t of audio.playlist ?? []) {
    if (t.src && !isSafeAudioSrc(t.src)) return t.src;
  }
  return null;
}

/**
 * Path penyimpanan audio harus persis `<userId>/<namaberkas>`: satu level, tanpa "..", "//" atau backslash.
 * Mencegah path traversal ke folder pengguna lain.
 */
export function isOwnedAudioPath(path: string, userId: string): boolean {
  if (typeof path !== "string" || path.length > 400) return false;
  if (!path.startsWith(`${userId}/`)) return false;
  const rest = path.slice(userId.length + 1);
  if (!rest || rest.includes("/") || rest.includes("\\")) return false;
  if (rest === "." || rest === ".." || rest.startsWith(".")) return false;
  return true;
}

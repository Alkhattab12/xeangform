// Helper batas waktu ujian. Murni (tanpa dependensi server) agar dipakai server dan klien.

/** Masa tenggang (ms) setelah tenggat: mengakomodasi latensi jaringan saat kirim otomatis waktu habis. */
export const TIME_LIMIT_GRACE_MS = 45_000;

/** Tenggat (epoch ms) = waktu mulai sesi di server + durasi. null jika waktu mulai tidak valid. */
export function deadlineMs(startedAtIso: string, minutes: number): number | null {
  const started = Date.parse(startedAtIso);
  return Number.isFinite(started) ? started + minutes * 60_000 : null;
}

/** 3725 -> "1:02:05"; 125 -> "02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

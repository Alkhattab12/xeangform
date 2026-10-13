"use client";

/**
 * Konversi volume persen (0-100) ke skala linier browser (0.0-1.0)
 * Menggunakan kurva kuadratis agar kenaikan volume terasa alami bagi pendengaran manusia.
 */
export function volumeToGain(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.pow(clamped / 100, 2);
}

/** Format detik ke string m:ss */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// ========================================================
// Validasi File Audio Kustom (MIME, Header/Magic Bytes, Ukuran)
// ========================================================
export type AudioValidationResult =
  | { ok: true; duration: number; format: "mp3" | "wav" | "ogg" | "m4a" | "aac"; sizeBytes: number }
  | { ok: false; error: string };

export const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Transisi volume halus (fade in / fade out) tanpa clipping
 */
export function fadeAudioGain(
  audio: HTMLAudioElement,
  startVolGain: number,
  targetVolGain: number,
  durationSeconds: number,
  onComplete?: () => void
): () => void {
  if (typeof window === "undefined" || !audio) return () => {};
  const startTime = performance.now();
  const durationMs = Math.max(100, durationSeconds * 1000);
  let animationId: number;

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    // Smooth easing
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    const currentGain = startVolGain + (targetVolGain - startVolGain) * Math.max(0, Math.min(1, eased));
    audio.volume = Math.max(0, Math.min(1, currentGain));

    if (progress < 1) {
      animationId = requestAnimationFrame(step);
    } else {
      audio.volume = Math.max(0, Math.min(1, targetVolGain));
      onComplete?.();
    }
  };

  animationId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(animationId);
}

export function detectAudioFormatFromBytes(bytes: Uint8Array): "mp3" | "wav" | "ogg" | "m4a" | "aac" | null {
  if (bytes.length < 4) return null;

  // RIFF....WAVE
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return "wav";
  }

  // OggS
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return "ogg";
  }

  // ID3 (MP3 dengan metadata tag)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return "mp3";
  }

  // MP3 frame sync (0xFF dilanjutkan 0xE0 mask)
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "mp3";
  }

  // MP4 / M4A (ftyp box)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "m4a";
  }

  // AAC ADTS
  if (bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0) {
    return "aac";
  }

  return null;
}

export async function validateAudioFile(file: File): Promise<AudioValidationResult> {
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return { ok: false, error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 15 MB.` };
  }

  // Baca header untuk memverifikasi magic bytes asli
  try {
    const buffer = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const format = detectAudioFormatFromBytes(bytes);

    if (!format) {
      return { ok: false, error: "Format file tidak didukung atau header rusak. Gunakan file audio MP3, WAV, OGG, atau M4A/AAC asli." };
    }

    // Uji kemampuan decode & ambil durasi audio asli dari browser
    const duration = await new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeAttribute("src");
        audio.load();
      };
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        cleanup();
        if (Number.isFinite(d) && d > 0) resolve(d);
        else reject(new Error("Gagal membaca durasi audio."));
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("Browser gagal memuat data audio ini. File mungkin korup."));
      };
      audio.src = url;
    });

    return { ok: true, duration, format, sizeBytes: file.size };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memeriksa file audio.";
    return { ok: false, error: msg };
  }
}

// ========================================================
// Singleton Preview Player untuk Form Editor
// Menjamin hanya 1 audio yang berbunyi saat memilih di pustaka
// ========================================================
class EditorAudioPreviewManager {
  private audio: HTMLAudioElement | null = null;
  private currentSrc: string | null = null;
  private listeners = new Set<() => void>();

  public isPlaying = false;
  public currentTime = 0;
  public duration = 0;
  public isLoading = false;
  public error: string | null = null;
  public activeSrc: string | null = null;

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private init() {
    if (typeof window === "undefined") return;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "metadata";
      this.audio.onplay = () => {
        this.isPlaying = true;
        this.isLoading = false;
        this.notify();
      };
      this.audio.onpause = () => {
        this.isPlaying = false;
        this.notify();
      };
      this.audio.onended = () => {
        this.isPlaying = false;
        this.currentTime = 0;
        this.notify();
      };
      this.audio.ontimeupdate = () => {
        if (this.audio) {
          this.currentTime = this.audio.currentTime;
          this.notify();
        }
      };
      this.audio.onloadedmetadata = () => {
        if (this.audio) {
          this.duration = this.audio.duration;
          this.isLoading = false;
          this.notify();
        }
      };
      this.audio.onerror = () => {
        this.isLoading = false;
        this.isPlaying = false;
        this.error = "Gagal memuat file audio. Periksa sumber file.";
        this.notify();
      };
    }
  }

  private cancelFade: (() => void) | null = null;

  public play(src: string, volumePercent: number, fadeInDuration = 0) {
    this.init();
    if (!this.audio) return;

    if (this.cancelFade) {
      this.cancelFade();
      this.cancelFade = null;
    }

    this.error = null;
    const targetGain = volumeToGain(volumePercent);

    if (this.activeSrc === src && this.isPlaying) {
      this.pause();
      return;
    }

    if (this.activeSrc !== src) {
      this.activeSrc = src;
      this.currentSrc = src;
      this.audio.src = src;
      this.audio.currentTime = 0;
      this.isLoading = true;
      this.duration = 0;
      this.currentTime = 0;
      this.notify();
    }

    if (fadeInDuration > 0) {
      this.audio.volume = 0;
    } else {
      this.audio.volume = targetGain;
    }

    this.audio.play().then(() => {
      if (fadeInDuration > 0 && this.audio) {
        this.cancelFade = fadeAudioGain(this.audio, 0, targetGain, fadeInDuration);
      }
    }).catch(() => {
      this.isPlaying = false;
      this.isLoading = false;
      this.error = "Pemutaran diblokir oleh browser atau file tidak dapat diputar.";
      this.notify();
    });
  }

  public pause(fadeOutDuration = 0) {
    if (this.cancelFade) {
      this.cancelFade();
      this.cancelFade = null;
    }
    if (!this.audio) return;

    if (fadeOutDuration > 0 && this.isPlaying) {
      const currentGain = this.audio.volume;
      this.cancelFade = fadeAudioGain(this.audio, currentGain, 0, fadeOutDuration, () => {
        this.audio?.pause();
        this.isPlaying = false;
        this.notify();
      });
    } else {
      this.audio.pause();
      this.isPlaying = false;
      this.notify();
    }
  }

  public seek(seconds: number) {
    if (this.audio && Number.isFinite(seconds)) {
      this.audio.currentTime = seconds;
      this.currentTime = seconds;
      this.notify();
    }
  }

  public setVolume(percent: number) {
    if (this.audio) {
      this.audio.volume = volumeToGain(percent);
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.isLoading = false;
      this.activeSrc = null;
      this.notify();
    }
  }
}

export const editorAudioPreview = new EditorAudioPreviewManager();

// ========================================================
// Procedural Web Audio Synthesizer (Zero-Asset Fallback)
// Suara mikro-interaksi UI (klik opsi, pindah halaman, sukses kuis)
// ========================================================
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playTactileSfx(type: "click" | "page" | "success" | "warn") {
  if (typeof window === "undefined") return;
  // Hormati reduced motion / reduced sensory
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case "click":
      // Snappy subtle pop
      osc.type = "triangle";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.04);
      break;

    case "page":
      // Subtle paper/card swoosh
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
      break;

    case "success":
      // Neo-brutalist victory chime (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, now + idx * 0.07);
        g.gain.setValueAtTime(0.08, now + idx * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.07);
        o.stop(now + idx * 0.07 + 0.35);
      });
      break;

    case "warn":
      // Low dual thud
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
  }
}

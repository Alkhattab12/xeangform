import type { AudioSettings } from "@/lib/forms/schema";

export type AudioStudioPresetKey =
  | "minimal"
  | "ambient"
  | "focus"
  | "cinematic"
  | "playlist"
  | "manual_start";

export type AudioStudioPreset = {
  id: AudioStudioPresetKey;
  label: string;
  tagline: string;
  description: string;
  settings: Partial<AudioSettings>;
};

export const AUDIO_STUDIO_PRESETS: AudioStudioPreset[] = [
  {
    id: "ambient",
    label: "Ambient Calm",
    tagline: "Lembut, santai & menenangkan",
    description: "Volume halus dengan transisi fade in lembut, ideal untuk form survei atau formulir pendaftaran.",
    settings: {
      volume: 25,
      startMode: "first_interaction",
      loopMode: "repeat_all",
      playbackMode: "sequential",
      fadeIn: true,
      fadeInDuration: 2.5,
      fadeOut: true,
      fadeOutDuration: 2.0,
      pauseOnTabSwitch: true,
      playerStyle: "floating_pill",
      playerPosition: "bottom_right",
    },
  },
  {
    id: "focus",
    label: "Deep Focus",
    tagline: "Irama stabil untuk konsentrasi",
    description: "Pemutar docked di bagian bawah, volume seimbang, suara tidak mengganggu konsentrasi membaca soal.",
    settings: {
      volume: 35,
      startMode: "first_interaction",
      loopMode: "repeat_all",
      playbackMode: "sequential",
      fadeIn: true,
      fadeInDuration: 1.5,
      fadeOut: false,
      pauseOnTabSwitch: true,
      playerStyle: "bottom_dock",
      playerPosition: "bottom_dock",
    },
  },
  {
    id: "minimal",
    label: "Minimal Compact",
    tagline: "Ringkas, hanya kontrol utama",
    description: "Hanya menampilkan tombol play/pause dan mute kecil di sudut layar tanpa memakan area formulir.",
    settings: {
      volume: 30,
      startMode: "first_interaction",
      loopMode: "repeat_one",
      playbackMode: "sequential",
      fadeIn: false,
      fadeOut: false,
      pauseOnTabSwitch: true,
      playerStyle: "minimal_icon",
      playerPosition: "bottom_right",
    },
  },
  {
    id: "cinematic",
    label: "Cinematic Experience",
    tagline: "Megah & imersif",
    description: "Player panel lengkap dengan artwork visual, transisi fade in/out panjang, dan dinamika audio maksimal.",
    settings: {
      volume: 45,
      startMode: "first_interaction",
      loopMode: "repeat_all",
      playbackMode: "sequential",
      fadeIn: true,
      fadeInDuration: 3.5,
      fadeOut: true,
      fadeOutDuration: 3.0,
      pauseOnTabSwitch: true,
      playerStyle: "expanded_panel",
      playerPosition: "bottom_right",
    },
  },
  {
    id: "playlist",
    label: "Continuous Playlist",
    tagline: "Banyak lagu bergantian",
    description: "Pengulangan seluruh daftar lagu secara berurutan atau acak dengan panel daftar putar.",
    settings: {
      volume: 35,
      startMode: "first_interaction",
      loopMode: "repeat_all",
      playbackMode: "sequential",
      fadeIn: true,
      fadeInDuration: 2.0,
      fadeOut: true,
      fadeOutDuration: 2.0,
      pauseOnTabSwitch: true,
      playerStyle: "expanded_panel",
      playerPosition: "bottom_right",
    },
  },
  {
    id: "manual_start",
    label: "Manual Play",
    tagline: "Responden memilih sendiri",
    description: "Tidak mencoba autoplay sama sekali; musik hanya berbunyi jika responden secara eksplisit menekan tombol putar.",
    settings: {
      volume: 40,
      startMode: "manual_play",
      loopMode: "repeat_all",
      playbackMode: "sequential",
      fadeIn: true,
      fadeInDuration: 1.5,
      fadeOut: false,
      pauseOnTabSwitch: true,
      playerStyle: "floating_pill",
      playerPosition: "bottom_right",
    },
  },
];

export function getPresetByKey(key: AudioStudioPresetKey): AudioStudioPreset | undefined {
  return AUDIO_STUDIO_PRESETS.find((p) => p.id === key);
}

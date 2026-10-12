import type { ThemePreset } from "@/lib/forms/schema";

export type AudioCategory =
  | "calm_ambient"
  | "cute_playful"
  | "lofi_focus"
  | "cinematic"
  | "fantasy_magic"
  | "galaxy_scifi"
  | "nature_zen"
  | "cooking_lifestyle"
  | "piano_instrumental"
  | "minimal_corporate";

export type AudioTrack = {
  id: string;
  title: string;
  artist: string;
  category: AudioCategory;
  categoryLabel: string;
  mood: string;
  description: string;
  src: string;
  duration: number; // detik
  license: string;
  recommendedTheme: ThemePreset;
};

export const AUDIO_CATEGORIES: { id: AudioCategory; label: string; description: string }[] = [
  { id: "calm_ambient", label: "Calm & Ambient", description: "Musik lembut dan menenangkan" },
  { id: "cute_playful", label: "Cute & Playful", description: "Musik ceria, ramah & ekspresif (maskot Puck)" },
  { id: "lofi_focus", label: "Lo-fi & Focus", description: "Suasana santai untuk membaca & mengisi pertanyaan" },
  { id: "cinematic", label: "Cinematic", description: "Atmosfer sinematik megah & inspiratif" },
  { id: "fantasy_magic", label: "Fantasy & Magic", description: "Arpeggio harpa & nuansa magis" },
  { id: "galaxy_scifi", label: "Galaxy & Sci-fi", description: "Synth futuristik, luar angkasa & cyberpunk" },
  { id: "nature_zen", label: "Nature & Zen", description: "Gemercik air, lonceng bambu & alam asri" },
  { id: "cooking_lifestyle", label: "Cooking & Lifestyle", description: "Bossa nova akustik hangat & bersahabat" },
  { id: "piano_instrumental", label: "Piano & Instrumental", description: "Alunan piano neoklasik meditatif" },
  { id: "minimal_corporate", label: "Minimal & Corporate", description: "Irama modern, bersih & profesional" },
];

export const BUILTIN_AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "calm-ambient",
    title: "Zen Horizon",
    artist: "Xeangform Soundscape",
    category: "calm_ambient",
    categoryLabel: "Calm & Ambient",
    mood: "Menenangkan, hangat, luas",
    description: "Swell pad lembut dengan frekuensi harmonis D Major 9 yang tidak mengalihkan konsentrasi.",
    src: "/audio/tracks/calm-ambient.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "kebumian",
  },
  {
    id: "cute-playful",
    title: "Puck's Sunny Garden",
    artist: "Xeangform & Puck",
    category: "cute_playful",
    categoryLabel: "Cute & Playful",
    mood: "Ceria, ringan, menggemaskan",
    description: "Petikan marimba & glockenspiel ceria dengan ritme memantul, dirancang khusus bersama maskot Puck.",
    src: "/audio/tracks/cute-playful.wav",
    duration: 5.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "imut",
  },
  {
    id: "lofi-focus",
    title: "Midnight Study Lo-Fi",
    artist: "Xeangform Soundscape",
    category: "lofi_focus",
    categoryLabel: "Lo-fi & Focus",
    mood: "Santai, fokus, hangat",
    description: "Akord Rhodes jazz santai (Dm9 - Cmaj9) dengan tekstur vinyl hangat, nyaman didengar berulang kali.",
    src: "/audio/tracks/lofi-focus.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "sosial",
  },
  {
    id: "cinematic",
    title: "Majestic Journey",
    artist: "Xeangform Soundscape",
    category: "cinematic",
    categoryLabel: "Cinematic",
    mood: "Megah, penuh harapan",
    description: "Gesekan dawai orkestra lembut dengan sub-bass sinematik untuk evaluasi atau kuis berbobot.",
    src: "/audio/tracks/cinematic.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "keren",
  },
  {
    id: "fantasy-magic",
    title: "Enchanted Chimes",
    artist: "Xeangform Soundscape",
    category: "fantasy_magic",
    categoryLabel: "Fantasy & Magic",
    mood: "Ajaib, dongeng, mistis",
    description: "Arpeggio harpa berpadu lonceng kristal yang membawa responden ke petualangan imajinatif.",
    src: "/audio/tracks/fantasy-magic.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "abstrak",
  },
  {
    id: "galaxy-scifi",
    title: "Cosmic Pulse",
    artist: "Xeangform Soundscape",
    category: "galaxy_scifi",
    categoryLabel: "Galaxy & Sci-fi",
    mood: "Futuristik, teknologi, kosmik",
    description: "Bantalan synth analog dengan modulasi LFO halus dan efek sinyal luar angkasa.",
    src: "/audio/tracks/galaxy-scifi.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "galaxy",
  },
  {
    id: "nature-zen",
    title: "Bamboo Stream",
    artist: "Xeangform Soundscape",
    category: "nature_zen",
    categoryLabel: "Nature & Zen",
    mood: "Hening, alami, segar",
    description: "Resonansi singing bowl A3 dengan gemercik tetesan air bambu yang membersihkan pikiran.",
    src: "/audio/tracks/nature-zen.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "biologi",
  },
  {
    id: "cooking-lifestyle",
    title: "Sunday Kitchen Bossa",
    artist: "Xeangform Soundscape",
    category: "cooking_lifestyle",
    categoryLabel: "Cooking & Lifestyle",
    mood: "Hangat, bersahabat, gurih",
    description: "Genjrengan gitar nilon bossa nova lembut bernuansa kafe pagi hari yang bersahabat.",
    src: "/audio/tracks/cooking-lifestyle.wav",
    duration: 5.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "cooking",
  },
  {
    id: "piano-instrumental",
    title: "Quiet Solitude",
    artist: "Xeangform Soundscape",
    category: "piano_instrumental",
    categoryLabel: "Piano & Instrumental",
    mood: "Mendalam, jernih, tenang",
    description: "Progresi nada piano neoklasik dengan peluruhan natural, cocok untuk survei mendalam.",
    src: "/audio/tracks/piano-instrumental.wav",
    duration: 6.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "neo",
  },
  {
    id: "minimal-corporate",
    title: "Modern Architecture",
    artist: "Xeangform Soundscape",
    category: "minimal_corporate",
    categoryLabel: "Minimal & Corporate",
    mood: "Bersih, terstruktur, profesional",
    description: "Petikan elektronik minimalis dan ketukan sub-bass stabil tanpa distorsi.",
    src: "/audio/tracks/minimal-corporate.wav",
    duration: 5.0,
    license: "CC0 Public Domain (Bebas royalti & komersial)",
    recommendedTheme: "unik",
  },
];

export function getTrackById(id: string): AudioTrack | undefined {
  return BUILTIN_AUDIO_TRACKS.find((t) => t.id === id);
}

export function getTracksByCategory(category: AudioCategory): AudioTrack[] {
  return BUILTIN_AUDIO_TRACKS.filter((t) => t.category === category);
}

export function getTrackForTheme(preset: ThemePreset): AudioTrack {
  const match = BUILTIN_AUDIO_TRACKS.find((t) => t.recommendedTheme === preset);
  return match ?? BUILTIN_AUDIO_TRACKS[0];
}

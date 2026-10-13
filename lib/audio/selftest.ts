import assert from "node:assert/strict";
import {
  audioSettingsSchema,
  DEFAULT_AUDIO_SETTINGS,
  resolvePlaylistTracks,
  type AudioSettings,
  type PlaylistTrack,
} from "../forms/schema";
import {
  formatAudioTime,
  volumeToGain,
  detectAudioFormatFromBytes,
} from "./engine";
import {
  AUDIO_STUDIO_PRESETS,
  getPresetByKey,
} from "./presets";

console.log("▶ Memulai Pengujian Advanced Backsound Studio...");

// ========================================================
// 1. Uji Skema Default & Backwards Compatibility
// ========================================================
console.log("  1. Menguji skema default & kompatibilitas ke belakang...");
const parsedDefault = audioSettingsSchema.parse({});
assert.equal(parsedDefault.enabled, false);
assert.equal(parsedDefault.volume, 35);
assert.equal(parsedDefault.loopMode, "repeat_all");
assert.equal(parsedDefault.playbackMode, "sequential");
assert.equal(parsedDefault.startMode, "first_interaction");
assert.equal(parsedDefault.playerStyle, "floating_pill");
assert.equal(parsedDefault.playlist.length, 0);

// Resolusi playlist untuk settings default (harus menghasilkan 1 track fallback yang valid)
const resolvedDefault = resolvePlaylistTracks(parsedDefault);
assert.equal(resolvedDefault.length, 1);
assert.equal(resolvedDefault[0].id, "lofi-focus");
assert.equal(resolvedDefault[0].title, "Midnight Study Lo-Fi");
console.log("     ✓ Skema default & resolusi fallback 100% valid.");

// Kompatibilitas dengan data form lama (hanya trackId & customUrl lama)
const legacyConfig = {
  enabled: true,
  trackId: "custom",
  customUrl: "https://example.com/audio/my-song.mp3",
  title: "Lagu Form Lama",
  volume: 50,
  loop: false,
};
const parsedLegacy = audioSettingsSchema.parse(legacyConfig);
assert.equal(parsedLegacy.enabled, true);
assert.equal(parsedLegacy.customUrl, "https://example.com/audio/my-song.mp3");
assert.equal(parsedLegacy.volume, 50);

const resolvedLegacy = resolvePlaylistTracks(parsedLegacy);
assert.equal(resolvedLegacy.length, 1);
assert.equal(resolvedLegacy[0].src, "https://example.com/audio/my-song.mp3");
assert.equal(resolvedLegacy[0].title, "Lagu Form Lama");
console.log("     ✓ Kompatibilitas form lawas aman.");

// ========================================================
// 2. Uji Skema Playlist Multi-Lagu
// ========================================================
console.log("  2. Menguji playlist multi-audio...");
const samplePlaylist: PlaylistTrack[] = [
  {
    id: "track-1",
    title: "Track Pembuka",
    artist: "Artist A",
    src: "/audio/tracks/calm-ambient.wav",
    duration: 6.0,
    source: "builtin",
  },
  {
    id: "track-2",
    title: "Track Pertengahan",
    artist: "Artist B",
    src: "/audio/tracks/lofi-focus.wav",
    duration: 6.0,
    source: "builtin",
  },
  {
    id: "track-3",
    title: "Track Penutup",
    artist: "Artist C",
    src: "https://storage.supabase.co/form-audio/custom.mp3",
    duration: 120,
    format: "mp3",
    source: "upload",
  },
];

const multiAudioSettings = audioSettingsSchema.parse({
  enabled: true,
  loopMode: "repeat_all",
  playbackMode: "shuffle",
  playlist: samplePlaylist,
});

assert.equal(multiAudioSettings.playlist.length, 3);
assert.equal(multiAudioSettings.playbackMode, "shuffle");

const resolvedMulti = resolvePlaylistTracks(multiAudioSettings);
assert.equal(resolvedMulti.length, 3);
assert.equal(resolvedMulti[0].title, "Track Pembuka");
assert.equal(resolvedMulti[2].format, "mp3");
console.log("     ✓ Playlist multi-lagu tersimpan dan terbaca sempurna.");

// ========================================================
// 3. Uji Preset Studio
// ========================================================
console.log("  3. Menguji preset audio studio...");
assert.equal(AUDIO_STUDIO_PRESETS.length >= 6, true);
for (const preset of AUDIO_STUDIO_PRESETS) {
  const merged = audioSettingsSchema.parse({
    ...DEFAULT_AUDIO_SETTINGS,
    ...preset.settings,
  });
  assert.equal(typeof merged.volume, "number");
  assert.equal(typeof merged.loopMode, "string");
  assert.equal(typeof merged.playerStyle, "string");
}
assert.equal(getPresetByKey("ambient")?.id, "ambient");
assert.equal(getPresetByKey("focus")?.settings.playerStyle, "bottom_dock");
console.log("     ✓ Seluruh preset studio valid dan konsisten.");

// ========================================================
// 4. Uji Deteksi Biner Magic Bytes di Server
// ========================================================
console.log("  4. Menguji deteksi magic bytes audio...");

// WAV: RIFF....WAVE
const wavHeader = new Uint8Array(16);
wavHeader.set([0x52, 0x49, 0x46, 0x46], 0);
wavHeader.set([0x57, 0x41, 0x56, 0x45], 8);
assert.equal(detectAudioFormatFromBytes(wavHeader), "wav");

// OGG: OggS
const oggHeader = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
assert.equal(detectAudioFormatFromBytes(oggHeader), "ogg");

// MP3 ID3
const id3Header = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
assert.equal(detectAudioFormatFromBytes(id3Header), "mp3");

// MP3 Frame Sync
const mp3Sync = new Uint8Array([0xff, 0xfb, 0x90, 0x64]);
assert.equal(detectAudioFormatFromBytes(mp3Sync), "mp3");

// M4A: ftyp
const m4aHeader = new Uint8Array(16);
m4aHeader.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], 0);
assert.equal(detectAudioFormatFromBytes(m4aHeader), "m4a");

// Non-audio corrupt file (e.g. PDF: %PDF)
const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
assert.equal(detectAudioFormatFromBytes(pdfHeader), null);
console.log("     ✓ Validasi magic bytes server akurat dan aman terhadap berkas palsu.");

// ========================================================
// 5. Uji Utilitas Audio Engine (Volume & Format Waktu)
// ========================================================
console.log("  5. Menguji fungsi matematis audio engine...");
assert.equal(volumeToGain(0), 0);
assert.equal(volumeToGain(100), 1);
assert.equal(volumeToGain(50), 0.25); // Kurva kuadratis (0.5^2)
assert.equal(volumeToGain(-10), 0);
assert.equal(volumeToGain(120), 1);

assert.equal(formatAudioTime(0), "0:00");
assert.equal(formatAudioTime(9), "0:09");
assert.equal(formatAudioTime(65), "1:05");
assert.equal(formatAudioTime(3599), "59:59");
assert.equal(formatAudioTime(NaN), "0:00");
console.log("     ✓ Perhitungan gain dan formatting waktu valid.");

console.log("\n Semua uji otomatis Advanced Backsound Studio BERHASIL (PASS)!");

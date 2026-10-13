"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  Disc,
  ListMusic,
  Headphones,
  Info,
  Link as LinkIcon,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AUDIO_CATEGORIES,
  BUILTIN_AUDIO_TRACKS,
  type AudioCategory,
  type AudioTrack,
} from "@/lib/audio/library";
import {
  editorAudioPreview,
  formatAudioTime,
  validateAudioFile,
} from "@/lib/audio/engine";
import {
  AUDIO_PLAYER_STYLES,
  AUDIO_START_MODES,
  type AudioPlayerStyle,
  type AudioSettings,
  type AudioStartMode,
} from "@/lib/forms/schema";

type Props = {
  audio: AudioSettings;
  activeTheme?: string;
  onChange: (patch: Partial<AudioSettings>) => void;
};

const legend = "mb-2 block font-display font-bold";
const hint = "mt-1 text-sm leading-relaxed text-muted-foreground";
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";
const miniBtn = "nb-btn nb-btn-ghost min-h-9 px-2.5 py-1 text-xs font-bold";

export function AudioSettingsPanel({ audio, activeTheme, onChange }: Props) {
  const volId = useId();
  const searchId = useId();

  // State untuk preview engine
  const [previewState, setPreviewState] = useState({
    isPlaying: false,
    activeSrc: null as string | null,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null as string | null,
  });

  // Filter pustaka
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<AudioCategory | "all">("all");
  const [sourceMode, setSourceMode] = useState<"library" | "custom">(
    audio.customUrl ? "custom" : "library"
  );

  // Status kustom URL / Upload file
  const [customInputUrl, setCustomInputUrl] = useState(audio.customUrl || "");
  const [customTesting, setCustomTesting] = useState(false);
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Berlangganan event preview player singleton
  useEffect(() => {
    const unsub = editorAudioPreview.subscribe(() => {
      setPreviewState({
        isPlaying: editorAudioPreview.isPlaying,
        activeSrc: editorAudioPreview.activeSrc,
        currentTime: editorAudioPreview.currentTime,
        duration: editorAudioPreview.duration,
        isLoading: editorAudioPreview.isLoading,
        error: editorAudioPreview.error,
      });
    });
    return () => {
      unsub();
      // Saat berpindah tab atau menutup panel, hentikan preview audio
      editorAudioPreview.stop();
    };
  }, []);

  // Filter list lagu
  const filteredTracks = useMemo(() => {
    return BUILTIN_AUDIO_TRACKS.filter((t) => {
      const matchCat = selectedCat === "all" || t.category === selectedCat;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, selectedCat]);

  // Preview kontrol
  const togglePreview = (src: string) => {
    if (previewState.activeSrc === src && previewState.isPlaying) {
      editorAudioPreview.pause();
    } else {
      editorAudioPreview.play(src, audio.volume);
    }
  };

  // Pilih lagu dari pustaka
  const selectTrack = (track: AudioTrack) => {
    onChange({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      license: track.license,
      customUrl: "",
    });
  };

  // Uji kustom URL
  const testCustomUrl = () => {
    const url = customInputUrl.trim();
    if (!url) {
      setCustomStatus("Masukkan URL audio terlebih dahulu.");
      return;
    }
    setCustomTesting(true);
    setCustomStatus("Menguji URL audio…");

    const testAudio = new Audio();
    testAudio.preload = "metadata";
    testAudio.onloadedmetadata = () => {
      setCustomTesting(false);
      setCustomStatus(`✓ Audio valid! Durasi: ${formatAudioTime(testAudio.duration)}`);
      onChange({
        customUrl: url,
        trackId: "custom",
        title: url.split("/").pop()?.slice(0, 40) || "Musik Kustom",
        artist: "Sumber Eksternal",
        duration: Math.round(testAudio.duration),
        license: "Pengguna Sendiri",
      });
      editorAudioPreview.play(url, audio.volume);
    };
    testAudio.onerror = () => {
      setCustomTesting(false);
      setCustomStatus("✕ Gagal memuat audio dari URL tersebut. Pastikan tautan langsung ke file MP3/WAV/OGG dengan akses publik.");
    };
    testAudio.src = url;
  };

  // Handle upload file lokal
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(`Memeriksa file ${file.name}…`);

    const result = await validateAudioFile(file);
    if (!result.ok) {
      setUploadError(result.error);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadProgress("Mempersiapkan audio…");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadProgress(null);
      onChange({
        customUrl: dataUrl,
        trackId: "uploaded-file",
        title: file.name.replace(/\.[^/.]+$/, "").slice(0, 50),
        artist: `File Lokal (${(file.size / 1024).toFixed(0)} KB)`,
        duration: Math.round(result.duration),
        license: "Diunggah oleh Pemilik Form",
      });
      editorAudioPreview.play(dataUrl, audio.volume);
    };
    reader.onerror = () => {
      setUploadProgress(null);
      setUploadError("Gagal membaca file dari perangkat.");
    };
    reader.readAsDataURL(file);
  };

  // Lepas kustom audio
  const removeCustomAudio = () => {
    if (window.confirm("Lepaskan audio kustom ini dan kembali ke pustaka musik?")) {
      setCustomInputUrl("");
      setCustomStatus(null);
      setUploadError(null);
      setSourceMode("library");
      const defaultTrack = BUILTIN_AUDIO_TRACKS[0];
      selectTrack(defaultTrack);
      editorAudioPreview.stop();
    }
  };

  return (
    <div className="nb-panel nb-panel-strong space-y-6 p-4">
      {/* Header Panel */}
      <div>
        <div className="flex items-center justify-between">
          <p className="nb-mono">Musik Latar & Audio</p>
          <span className="nb-mono border border-line bg-surface px-1.5 py-0.5 text-[11px]">
            {audio.enabled ? "Aktif" : "Nonaktif"}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Atur musik latar yang menemani responden saat mengisi form atau kuis dengan kontrol yang nyaman dan ramah privasi.
        </p>
      </div>

      {/* 1. SAKLAR UTAMA (ON / OFF) */}
      <div className="border-2 border-line bg-surface p-3.5">
        <label className={choice}>
          <input
            type="checkbox"
            className={box}
            checked={audio.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <div>
            <span className="font-display font-bold">Aktifkan Musik Latar (Backsound)</span>
            <p className="text-xs text-muted-foreground">
              Responden akan melihat pemutar musik mini saat membuka formulir ini.
            </p>
          </div>
        </label>
      </div>

      {/* INFORMASI LAGU AKTIF & EMPTY STATE */}
      <div className="border-2 border-line bg-surface p-3.5">
        <p className="nb-mono mb-2 text-xs">Lagu Terpilih</p>
        {audio.title ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-ink">
                  {audio.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {audio.artist} · {audio.license}
                </p>
              </div>
              {audio.duration && (
                <span className="nb-mono shrink-0 border border-line px-1.5 py-0.5 text-xs">
                  {formatAudioTime(audio.duration)}
                </span>
              )}
            </div>

            {/* Quick Preview Lagu Terpilih */}
            <div className="mt-2 flex items-center gap-2 pt-1">
              {(() => {
                const activeSrc =
                  audio.customUrl ||
                  BUILTIN_AUDIO_TRACKS.find((t) => t.id === audio.trackId)?.src;
                if (!activeSrc) return null;
                const isThisPlaying =
                  previewState.activeSrc === activeSrc && previewState.isPlaying;

                return (
                  <button
                    type="button"
                    onClick={() => togglePreview(activeSrc)}
                    className="nb-btn min-h-9 flex-1 gap-1.5 px-3 py-1 text-xs"
                  >
                    {isThisPlaying ? (
                      <>
                        <Pause size={14} aria-hidden="true" /> Jeda Pratinjau
                      </>
                    ) : (
                      <>
                        <Play size={14} aria-hidden="true" /> Dengarkan Pratinjau
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="py-2 text-center">
            <Disc className="mx-auto mb-1 h-6 w-6 text-muted-foreground animate-spin" />
            <p className="text-sm font-bold">Belum ada lagu yang dipilih</p>
            <p className="text-xs text-muted-foreground">Pilih lagu dari pustaka di bawah ini.</p>
          </div>
        )}
      </div>

      {/* PILIHAN SUMBER: PUSTAKA ATAU KUSTOM */}
      <div>
        <p className={legend}>Sumber Musik</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sumber musik">
          <button
            type="button"
            aria-pressed={sourceMode === "library"}
            onClick={() => setSourceMode("library")}
            className={`nb-btn min-h-10 text-xs font-bold ${
              sourceMode === "library" ? "" : "nb-btn-ghost"
            }`}
          >
            <ListMusic size={14} className="mr-1 inline" aria-hidden="true" /> Pustaka ({BUILTIN_AUDIO_TRACKS.length})
          </button>
          <button
            type="button"
            aria-pressed={sourceMode === "custom"}
            onClick={() => setSourceMode("custom")}
            className={`nb-btn min-h-10 text-xs font-bold ${
              sourceMode === "custom" ? "" : "nb-btn-ghost"
            }`}
          >
            <Upload size={14} className="mr-1 inline" aria-hidden="true" /> Kustom / URL
          </button>
        </div>
      </div>

      {/* MODE 1: PUSTAKA AUDIO BAWAAN */}
      {sourceMode === "library" && (
        <div className="space-y-4 rounded border-2 border-line bg-surface p-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold">Pustaka Musik Asli</p>
            <span className="text-[11px] text-muted-foreground">Instrumental Bebas Royalti</span>
          </div>

          {/* Pencarian */}
          <div>
            <label htmlFor={searchId} className="sr-only">Cari musik</label>
            <input
              id={searchId}
              type="text"
              placeholder="Cari judul, suasana, atau genre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-2 border-line bg-surface px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>

          {/* Kategori Filter Tabs */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedCat("all")}
              className={`border border-line px-2 py-0.5 text-[11px] font-bold ${
                selectedCat === "all" ? "bg-ink text-surface" : "bg-surface"
              }`}
            >
              Semua
            </button>
            {AUDIO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`border border-line px-2 py-0.5 text-[11px] font-bold ${
                  selectedCat === cat.id ? "bg-ink text-surface" : "bg-surface"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Daftar Lagu */}
          <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {filteredTracks.map((track) => {
              const isSelected = audio.trackId === track.id && !audio.customUrl;
              const isPlaying =
                previewState.activeSrc === track.src && previewState.isPlaying;
              const isMatchTheme = activeTheme && track.recommendedTheme === activeTheme;

              return (
                <div
                  key={track.id}
                  className={`border-2 p-2.5 transition-all ${
                    isSelected
                      ? "border-cobalt bg-accent/15 shadow-[2px_2px_0px_#3457ff]"
                      : "border-line bg-surface hover:border-ink"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-display text-sm font-bold text-ink">
                          {track.title}
                        </p>
                        {isMatchTheme && (
                          <span className="flex items-center gap-0.5 rounded border border-line bg-accent px-1 text-[10px] font-bold text-ink" title="Sangat cocok dengan tema form aktif">
                            <Sparkles size={10} aria-hidden="true" /> Cocok
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{track.mood}</p>
                    </div>

                    <span className="nb-mono shrink-0 text-xs">
                      {formatAudioTime(track.duration)}
                    </span>
                  </div>

                  {/* Kontrol Preview & Pilih */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-line/40">
                    <button
                      type="button"
                      onClick={() => togglePreview(track.src)}
                      className={`nb-btn min-h-8 gap-1 px-2.5 py-0.5 text-xs font-bold ${
                        isPlaying ? "bg-ink text-surface" : "nb-btn-ghost"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause size={12} aria-hidden="true" /> Jeda
                        </>
                      ) : (
                        <>
                          <Play size={12} aria-hidden="true" /> Dengar
                        </>
                      )}
                    </button>

                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-cobalt">
                        <Check size={14} aria-hidden="true" /> Sedang Dipakai
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectTrack(track)}
                        className="nb-btn min-h-8 px-3 py-0.5 text-xs font-bold"
                      >
                        Pilih Musik Ini
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTracks.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Tidak ada musik yang cocok dengan pencarian.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: KUSTOM AUDIO / URL / UPLOAD */}
      {sourceMode === "custom" && (
        <div className="space-y-4 rounded border-2 border-line bg-surface p-3">
          <p className="font-display text-sm font-bold">Gunakan File atau Tautan Sendiri</p>

          {/* Opsi A: Tautan URL Langsung */}
          <div className="space-y-2">
            <label className="text-xs font-bold">Tautan URL Audio (MP3/WAV/OGG):</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/musik.mp3"
                value={customInputUrl}
                onChange={(e) => setCustomInputUrl(e.target.value)}
                className="flex-1 border-2 border-line bg-surface px-2.5 py-1 text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={testCustomUrl}
                disabled={customTesting}
                className="nb-btn min-h-8 px-3 py-1 text-xs font-bold"
              >
                {customTesting ? "Menguji…" : "Uji & Terapkan"}
              </button>
            </div>
            {customStatus && (
              <p className={`text-xs ${customStatus.startsWith("✓") ? "text-green-700 font-bold" : "text-orange font-bold"}`}>
                {customStatus}
              </p>
            )}
          </div>

          {/* Opsi B: Unggah File Langsung */}
          <div className="border-t border-line pt-3 space-y-2">
            <label className="text-xs font-bold">Unggah File Audio dari Perangkat:</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                onChange={handleFileUpload}
                className="text-xs file:mr-2 file:cursor-pointer file:border-2 file:border-line file:bg-surface file:px-2.5 file:py-1 file:font-display file:font-bold"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Maksimal 10 MB. Format yang didukung: MP3, WAV, atau OGG asli.
            </p>
            {uploadProgress && (
              <p className="text-xs text-cobalt font-bold">{uploadProgress}</p>
            )}
            {uploadError && (
              <p className="text-xs text-orange font-bold">{uploadError}</p>
            )}
          </div>

          {/* Tombol Lepas Audio Kustom */}
          {audio.customUrl && (
            <div className="pt-2">
              <button
                type="button"
                onClick={removeCustomAudio}
                className="nb-btn nb-btn-ghost min-h-8 w-full gap-1 text-xs text-orange hover:bg-orange/10"
              >
                <Trash2 size={13} aria-hidden="true" /> Lepaskan Audio Kustom
              </button>
            </div>
          )}
        </div>
      )}

      {/* KONTROL VOLUME AWAL */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={volId} className={legend}>
            Volume Awal: {audio.volume}%
          </label>
          <span className="nb-mono text-xs">
            {audio.volume === 0 ? "Muted" : audio.volume > 60 ? "Tinggi" : "Sedang"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ volume: audio.volume === 0 ? 35 : 0 })}
            className="flex h-9 w-9 items-center justify-center border-2 border-line bg-surface"
            aria-label={audio.volume === 0 ? "Batal bisukan" : "Bisukan volume"}
          >
            {audio.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            id={volId}
            type="range"
            min={0}
            max={100}
            step={5}
            value={audio.volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange({ volume: val });
              editorAudioPreview.setVolume(val);
            }}
            className="h-8 flex-1 accent-[#3457ff]"
          />
        </div>
        <p className={hint}>
          Volume default yang terdengar saat responden pertama kali memulai audio (direkomendasikan 25% - 40%).
        </p>
      </div>

      {/* PENGULANGAN (LOOPING) */}
      <fieldset>
        <legend className={legend}>Mode Pengulangan (Loop)</legend>
        <label className={choice}>
          <input
            type="radio"
            name="a-loop"
            className={box}
            checked={audio.loop}
            onChange={() => onChange({ loop: true })}
          />
          <div>
            <span className="font-bold">Ulangi Terus (Seamless Loop)</span>
            <p className="text-xs text-muted-foreground">Lagu diputar terus menerus selama responden mengisi form.</p>
          </div>
        </label>
        <label className={choice}>
          <input
            type="radio"
            name="a-loop"
            className={box}
            checked={!audio.loop}
            onChange={() => onChange({ loop: false })}
          />
          <div>
            <span className="font-bold">Putar Sekali</span>
            <p className="text-xs text-muted-foreground">Berhenti otomatis setelah durasi lagu selesai.</p>
          </div>
        </label>
      </fieldset>

      {/* PERILAKU PEMUTARAN AWAL (BROWSER AUTOPLAY COMPLIANCE) */}
      <fieldset>
        <legend className={legend}>Kapan Musik Mulai Diputar</legend>
        <label className={choice}>
          <input
            type="radio"
            name="a-start"
            className={box}
            checked={audio.startMode === "first_interaction"}
            onChange={() => onChange({ startMode: "first_interaction" })}
          />
          <div>
            <span className="font-bold">Interaksi Pertama Responden</span>
            <p className="text-xs text-muted-foreground">
              Musik mulai diputar saat responden pertama kali mengetuk tombol atau memilih jawaban (sesuai standar browser).
            </p>
          </div>
        </label>
        <label className={choice}>
          <input
            type="radio"
            name="a-start"
            className={box}
            checked={audio.startMode === "manual_play"}
            onChange={() => onChange({ startMode: "manual_play" })}
          />
          <div>
            <span className="font-bold">Responden Menekan Tombol Play</span>
            <p className="text-xs text-muted-foreground">
              Musik diam sampai responden sengaja menekan tombol putar pada widget mini player.
            </p>
          </div>
        </label>
      </fieldset>

      {/* PENGHENTIAN SAAT SELESAI */}
      <fieldset>
        <legend className={legend}>Kapan Musik Berhenti</legend>
        <label className={choice}>
          <input
            type="radio"
            name="a-stop"
            className={box}
            checked={audio.stopOnSubmit}
            onChange={() => onChange({ stopOnSubmit: true })}
          />
          <div>
            <span className="font-bold">Berhenti Saat Form Dikirim</span>
            <p className="text-xs text-muted-foreground">Audio berhenti seketika setelah formulir berhasil dikirimkan.</p>
          </div>
        </label>
        <label className={choice}>
          <input
            type="radio"
            name="a-stop"
            className={box}
            checked={!audio.stopOnSubmit}
            onChange={() => onChange({ stopOnSubmit: false })}
          />
          <div>
            <span className="font-bold">Tetap Putar di Halaman Selesai</span>
            <p className="text-xs text-muted-foreground">Musik terus mengalun saat responden melihat skor atau ucapan terima kasih.</p>
          </div>
        </label>
      </fieldset>

      {/* TAMPILAN MINI PLAYER */}
      <fieldset>
        <legend className={legend}>Tampilan Pemutar (Mini Player)</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "floating_pill", label: "Pill Mengambang", desc: "Kanan bawah layar (Elegan)" },
            { id: "bottom_dock", label: "Dock Bawah", desc: "Bar tetap di bagian bawah" },
            { id: "header_badge", label: "Badge Atas", desc: "Sudut kanan atas" },
            { id: "minimal_icon", label: "Ikon Minimal", desc: "Hanya tombol speaker" },
          ].map((style) => (
            <button
              key={style.id}
              type="button"
              aria-pressed={audio.playerStyle === style.id}
              onClick={() => onChange({ playerStyle: style.id as AudioPlayerStyle })}
              className={`border-2 p-2.5 text-left transition-all ${
                audio.playerStyle === style.id
                  ? "border-cobalt bg-accent/20 shadow-[2px_2px_0px_#3457ff]"
                  : "border-line bg-surface hover:border-ink"
              }`}
            >
              <p className="font-display text-xs font-bold">{style.label}</p>
              <p className="text-[10px] text-muted-foreground">{style.desc}</p>
            </button>
          ))}
        </div>
      </fieldset>

      {/* SAKLAR EFEK SUARA UI (SFX) */}
      <div className="border-t-2 border-line pt-4">
        <label className={choice}>
          <input
            type="checkbox"
            className={box}
            checked={audio.sfxEnabled}
            onChange={(e) => onChange({ sfxEnabled: e.target.checked })}
          />
          <div>
            <span className="font-display font-bold">Efek Suara Interaktif (SFX)</span>
            <p className="text-xs text-muted-foreground">
              Suara taktil &quot;pop&quot; saat memilih opsi jawaban, membalik halaman, dan denting sukses saat selesai.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

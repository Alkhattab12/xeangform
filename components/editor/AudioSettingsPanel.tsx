"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Disc,
  Edit2,
  Eye,
  EyeOff,
  Headphones,
  HelpCircle,
  Info,
  Layers,
  Layout,
  ListMusic,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Repeat1,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
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
  AUDIO_LOOP_MODES,
  AUDIO_PLAYBACK_MODES,
  AUDIO_PLAYER_POSITIONS,
  AUDIO_PLAYER_STYLES,
  AUDIO_START_MODES,
  resolvePlaylistTracks,
  type AudioLoopMode,
  type AudioPlaybackMode,
  type AudioPlayerPosition,
  type AudioPlayerStyle,
  type AudioSettings,
  type AudioStartMode,
  type PlaylistTrack,
} from "@/lib/forms/schema";
import {
  AUDIO_STUDIO_PRESETS,
  getPresetByKey,
  type AudioStudioPresetKey,
} from "@/lib/audio/presets";
import {
  deleteUploadedAudioAction,
  getUserAudioLibraryAction,
  uploadAudioTrackAction,
  type AudioUploadResult,
} from "@/app/actions/audio";

type Props = {
  audio: AudioSettings;
  activeTheme?: string;
  formId?: string;
  onChange: (patch: Partial<AudioSettings>) => void;
};

type StudioTab = "playlist" | "playback" | "player" | "preview";
type AddSourceTab = "builtin" | "upload" | "library";

const legend = "mb-2 block font-display font-bold text-sm";
const hint = "mt-1 text-xs leading-relaxed text-muted-foreground";
const choice = "flex min-h-11 cursor-pointer items-start sm:items-center gap-2.5 sm:gap-3 min-w-0";
const box = "h-5 w-5 shrink-0 accent-[#3457ff] mt-0.5 sm:mt-0";
const smallBtn = "nb-btn nb-btn-ghost min-h-8 px-2 py-1 text-xs font-bold";

export function AudioSettingsPanel({ audio, activeTheme, formId, onChange }: Props) {
  const volId = useId();

  // Tab utama studio
  const [studioTab, setStudioTab] = useState<StudioTab>("playlist");
  const [addSourceTab, setAddSourceTab] = useState<AddSourceTab>("builtin");

  // State sinkronisasi dengan engine preview
  const [previewState, setPreviewState] = useState({
    isPlaying: false,
    activeSrc: null as string | null,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null as string | null,
  });

  // State daftar putar aktif
  const currentPlaylist = useMemo(() => resolvePlaylistTracks(audio), [audio]);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");

  // Filter pustaka bawaan
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<AudioCategory | "all">("all");

  // Status upload file
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status pustaka pengguna
  const [userLibrary, setUserLibrary] = useState<PlaylistTrack[]>([]);
  const [loadingUserLibrary, setLoadingUserLibrary] = useState(false);
  const [userLibraryError, setUserLibraryError] = useState<string | null>(null);

  // Mode pratinjau studio (desktop / mobile frame)
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

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
      editorAudioPreview.stop();
    };
  }, []);

  // Muat pustaka audio pengguna ketika membuka sub-tab library
  useEffect(() => {
    if (addSourceTab === "library") {
      setLoadingUserLibrary(true);
      setUserLibraryError(null);
      getUserAudioLibraryAction()
        .then((res) => {
          if (res.ok) {
            setUserLibrary(res.tracks);
          } else {
            setUserLibraryError(res.error);
          }
        })
        .catch(() => {
          setUserLibraryError("Gagal memuat pustaka audio.");
        })
        .finally(() => {
          setLoadingUserLibrary(false);
        });
    }
  }, [addSourceTab]);

  // Filter list lagu bawaan
  const filteredBuiltinTracks = useMemo(() => {
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
      editorAudioPreview.pause(audio.fadeOut ? audio.fadeOutDuration : 0);
    } else {
      editorAudioPreview.play(
        src,
        audio.volume,
        audio.fadeIn ? audio.fadeInDuration : 0
      );
    }
  };

  // Terapkan Preset Studio
  const applyPreset = (presetKey: AudioStudioPresetKey) => {
    const preset = getPresetByKey(presetKey);
    if (!preset) return;

    if (
      window.confirm(
        `Terapkan preset "${preset.label}"? Pengaturan pemutaran dan tampilan akan disesuaikan dengan konfigurasi preset ini.`
      )
    ) {
      onChange({
        ...preset.settings,
        enabled: true,
      });
    }
  };

  // Tambah lagu bawaan ke playlist
  const addBuiltinTrackToPlaylist = (t: AudioTrack) => {
    const newTrack: PlaylistTrack = {
      id: `${t.id}-${Date.now().toString(36)}`,
      title: t.title,
      artist: t.artist,
      src: t.src,
      duration: t.duration,
      license: t.license,
      source: "builtin",
    };

    const updated = [...currentPlaylist, newTrack];
    onChange({
      playlist: updated,
      // Sinkronkan legacy field
      trackId: newTrack.id,
      title: newTrack.title,
      artist: newTrack.artist,
      duration: newTrack.duration,
      customUrl: "",
    });
  };

  // Tambah lagu dari pustaka pengguna ke playlist
  const addUserTrackToPlaylist = (t: PlaylistTrack) => {
    const newTrack: PlaylistTrack = {
      ...t,
      id: `${t.id}-${Date.now().toString(36)}`,
    };
    const updated = [...currentPlaylist, newTrack];
    onChange({
      playlist: updated,
      trackId: newTrack.id,
      title: newTrack.title,
      artist: newTrack.artist,
      duration: newTrack.duration,
      customUrl: newTrack.src,
    });
  };

  // Hapus lagu dari playlist
  const removeTrackFromPlaylist = (index: number) => {
    if (currentPlaylist.length <= 1) {
      if (
        !window.confirm(
          "Ini adalah satu-satunya lagu dalam playlist. Menghapusnya akan mengembalikan ke lagu default. Lanjutkan?"
        )
      ) {
        return;
      }
    }
    const target = currentPlaylist[index];
    if (previewState.activeSrc === target.src) {
      editorAudioPreview.stop();
    }
    const updated = currentPlaylist.filter((_, i) => i !== index);
    onChange({
      playlist: updated,
      ...(updated.length > 0
        ? {
            trackId: updated[0].id,
            title: updated[0].title,
            artist: updated[0].artist,
            duration: updated[0].duration,
            customUrl: updated[0].source === "builtin" ? "" : updated[0].src,
          }
        : {}),
    });
  };

  // Pindahkan urutan lagu di playlist
  const moveTrackInPlaylist = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentPlaylist.length) return;
    const updated = [...currentPlaylist];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onChange({ playlist: updated });
  };

  // Simpan pengubahan nama judul lagu
  const saveRenameTrack = (index: number) => {
    if (!editingTitleText.trim()) return;
    const updated = [...currentPlaylist];
    updated[index] = { ...updated[index], title: editingTitleText.trim() };
    onChange({ playlist: updated });
    setEditingTrackId(null);
  };

  // Upload berkas audio baru dari perangkat
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadStatus("Memvalidasi berkas audio…");
    setUploadProgressPercent(10);

    const newTracks: PlaylistTrack[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Memeriksa berkas ${i + 1}/${files.length}: ${file.name}…`);

        // 1. Validasi lokal browser (magic bytes & durasi)
        const valid = await validateAudioFile(file);
        if (!valid.ok) {
          setUploadError(`Berkas "${file.name}": ${valid.error}`);
          setIsUploading(false);
          setUploadStatus(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const basePercent = 25 + Math.floor((i / files.length) * 65);
        setUploadProgressPercent(basePercent);
        setUploadStatus(`Mengunggah "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)…`);

        // 2. Unggah ke Server Action
        const formData = new FormData();
        formData.append("file", file);
        if (formId) formData.append("formId", formId);
        formData.append("title", file.name.replace(/\.[^/.]+$/, "").slice(0, 100));
        formData.append("duration", valid.duration.toString());

        // Simulasi progress tick saat upload berlangsung
        const tickTimer = setInterval(() => {
          setUploadProgressPercent((prev) => (prev < 85 ? prev + 5 : prev));
        }, 300);

        let res: AudioUploadResult;
        try {
          res = await uploadAudioTrackAction(formData);
        } finally {
          clearInterval(tickTimer);
        }

        if (!res.ok) {
          setUploadError(`Gagal mengunggah "${file.name}": ${res.error}`);
          setIsUploading(false);
          setUploadStatus(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        newTracks.push(res.track);
        setUploadProgressPercent(25 + Math.floor(((i + 1) / files.length) * 65));
      }

      setUploadProgressPercent(100);
      setUploadStatus("Berhasil diproses! Menambahkan ke daftar putar…");

      // Gabungkan dengan playlist aktif
      const updated = [...currentPlaylist, ...newTracks];
      onChange({
        playlist: updated,
        trackId: newTracks[0].id,
        title: newTracks[0].title,
        artist: newTracks[0].artist,
        duration: newTracks[0].duration,
        customUrl: newTracks[0].src,
      });

      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 800);
    } catch (err: unknown) {
      console.error("Audio upload error:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan atau server saat mengunggah.";
      setUploadError(`Gagal mengunggah audio: ${msg}`);
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Status informatif banner
  const getStatusBadge = () => {
    if (!audio.enabled) {
      return {
        label: "Nonaktif",
        color: "bg-surface border-line text-muted-foreground",
        desc: "Musik latar tidak akan berbunyi di halaman form responden.",
      };
    }
    if (isUploading) {
      return {
        label: "Mengunggah…",
        color: "bg-yellow-400 text-ink border-line font-bold animate-pulse",
        desc: uploadStatus || "Sedang memproses file audio ke penyimpanan cloud…",
      };
    }
    if (previewState.isPlaying) {
      return {
        label: "Sedang Dipratinjau ♪",
        color: "bg-accent text-[color:var(--on-accent)] border-line font-bold",
        desc: `Memutar pratinjau di editor (${formatAudioTime(previewState.currentTime)} / ${formatAudioTime(previewState.duration)})`,
      };
    }
    if (currentPlaylist.length > 0) {
      return {
        label: "Siap Digunakan ✓",
        color: "bg-emerald-400 text-ink border-line font-bold",
        desc: `Tersedia ${currentPlaylist.length} lagu di daftar putar.`,
      };
    }
    return {
      label: "Belum Dikonfigurasi",
      color: "bg-orange text-ink border-line",
      desc: "Tambahkan lagu ke playlist untuk mengaktifkan backsound.",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="nb-panel nb-panel-strong space-y-4 p-3 sm:p-4 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* 1. HEADER & STATUS STUDIO */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Headphones size={18} className="text-accent shrink-0" />
            <span className="font-display font-bold text-sm sm:text-base truncate">Backsound Studio</span>
          </div>
          <span className={`nb-mono border px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] shrink-0 ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {statusBadge.desc}
        </p>
      </div>

      {/* 2. SAKLAR UTAMA (MASTER TOGGLE) */}
      <div className="border-2 border-line bg-surface p-3 min-w-0">
        <label className={choice}>
          <input
            type="checkbox"
            className={box}
            checked={audio.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <div className="min-w-0">
            <span className="font-display font-bold text-sm">Aktifkan Musik Latar</span>
            <p className="text-xs text-muted-foreground">
              Responden akan mendengar musik saat membuka formulir ini.
            </p>
          </div>
        </label>
      </div>

      {/* 3. PRESET STUDIO INSTAN */}
      <div className="border border-line bg-surface/50 p-2.5 sm:p-3 min-w-0">
        <div className="flex items-center justify-between mb-2 min-w-0">
          <span className="text-xs font-bold flex items-center gap-1 shrink-0">
            <Sparkles size={13} className="text-amber-500" /> Preset Studio Cepat
          </span>
          <span className="text-[10px] text-muted-foreground truncate ml-1">Pilih untuk menerapkan</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 min-w-0">
          {AUDIO_STUDIO_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="border border-line bg-surface p-1.5 text-left hover:bg-surface-elevated hover:border-accent transition-all text-xs min-w-0 overflow-hidden"
              title={`${p.tagline} — ${p.description}`}
            >
              <span className="font-bold block truncate text-[11px] sm:text-xs">{p.label}</span>
              <span className="text-[9px] text-muted-foreground truncate block">{p.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. NAVIGASI TAB STUDIO */}
      <div className="grid grid-cols-4 gap-1 border-b-2 border-line pb-2 min-w-0" role="tablist">
        {(
          [
            ["playlist", "Playlist", ListMusic],
            ["playback", "Playback", Sliders],
            ["player", "Player", Layout],
            ["preview", "Preview", Eye],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={studioTab === k}
            onClick={() => setStudioTab(k)}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 sm:px-1 text-[10px] sm:text-[11px] font-bold border-2 transition-all min-w-0 overflow-hidden ${
              studioTab === k
                ? "border-line bg-accent text-[color:var(--on-accent)] shadow-[2px_2px_0px_#000]"
                : "border-transparent bg-surface hover:border-line/40 text-muted-foreground"
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="truncate max-w-full">{label}</span>
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PLAYLIST & AUDIO LIBRARY */}
      {/* ======================================================== */}
      {studioTab === "playlist" && (
        <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden">
          {/* DAFTAR PUTAR AKTIF */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-wider truncate">
                Daftar Lagu ({currentPlaylist.length})
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-1">
                {formatAudioTime(currentPlaylist.reduce((acc, t) => acc + (t.duration || 0), 0))}
              </span>
            </div>

            {currentPlaylist.length === 0 ? (
              <div className="border-2 border-dashed border-line p-4 text-center text-xs text-muted-foreground">
                Belum ada lagu dalam playlist. Tambahkan dari pustaka atau unggah file audio di bawah.
              </div>
            ) : (
              <ol className="space-y-2 max-h-56 overflow-y-auto pr-1 w-full min-w-0">
                {currentPlaylist.map((track, idx) => {
                  const isCurrentPlaying =
                    previewState.activeSrc === track.src && previewState.isPlaying;
                  const isEditing = editingTrackId === track.id;

                  return (
                    <li
                      key={track.id || idx}
                      className={`nb-panel p-2 flex items-center justify-between gap-1.5 sm:gap-2 border-2 text-xs transition-all w-full min-w-0 overflow-hidden ${
                        isCurrentPlaying ? "border-accent bg-accent/10 shadow-[2px_2px_0px_#000]" : "border-line bg-surface"
                      }`}
                    >
                      {/* Play Preview */}
                      <button
                        type="button"
                        onClick={() => togglePreview(track.src)}
                        aria-label={isCurrentPlaying ? "Jeda lagu" : "Putar lagu"}
                        className="flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface active:scale-95"
                      >
                        {isCurrentPlaying ? (
                          <Pause size={12} className="text-accent" />
                        ) : (
                          <Play size={12} className="ml-0.5" />
                        )}
                      </button>

                      {/* Judul & Detail */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        {isEditing ? (
                          <div className="flex items-center gap-1 min-w-0">
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              className="h-6 w-full min-w-0 border border-line bg-surface px-1.5 text-xs font-bold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveRenameTrack(idx)}
                              className="px-1.5 h-6 bg-accent text-[color:var(--on-accent)] font-bold shrink-0"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTrackId(null)}
                              className="px-1.5 h-6 border border-line shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="nb-mono text-[10px] opacity-60 shrink-0">
                              {String(idx + 1).padStart(2, "0")}.
                            </span>
                            <span className="font-bold truncate min-w-0 flex-1">{track.title}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrackId(track.id);
                                setEditingTitleText(track.title);
                              }}
                              className="opacity-40 hover:opacity-100 shrink-0"
                              title="Ubah nama tampilan lagu"
                            >
                              <Edit2 size={10} />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate">
                          {track.artist || "Xeangform Sound"} · {formatAudioTime(track.duration)}
                          {track.format ? ` · ${track.format.toUpperCase()}` : ""}
                        </p>
                      </div>

                      {/* Kontrol Urutan & Hapus */}
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveTrackInPlaylist(idx, -1)}
                          aria-label="Pindahkan ke atas"
                          className="h-6 w-6 border border-line flex items-center justify-center disabled:opacity-30"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentPlaylist.length - 1}
                          onClick={() => moveTrackInPlaylist(idx, 1)}
                          aria-label="Pindahkan ke bawah"
                          className="h-6 w-6 border border-line flex items-center justify-center disabled:opacity-30"
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTrackFromPlaylist(idx)}
                          aria-label="Hapus dari daftar putar"
                          className="h-6 w-6 border border-line text-red-500 hover:bg-red-50 flex items-center justify-center"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* SUB-PANEL: TAMBAH LAGU */}
          <div className="border-t-2 border-line pt-3">
            <span className={legend}>Tambah Audio ke Playlist</span>

            {/* Pilihan Sumber Lagu */}
            <div className="grid grid-cols-3 gap-1 mb-3 min-w-0">
              <button
                type="button"
                onClick={() => setAddSourceTab("builtin")}
                className={`py-1.5 px-0.5 sm:px-1 text-[10px] sm:text-xs font-bold border truncate min-w-0 text-center ${
                  addSourceTab === "builtin" ? "bg-ink text-surface border-ink" : "bg-surface border-line"
                }`}
              >
                Pustaka Bawaan
              </button>
              <button
                type="button"
                onClick={() => setAddSourceTab("upload")}
                className={`py-1.5 px-0.5 sm:px-1 text-[10px] sm:text-xs font-bold border truncate min-w-0 text-center ${
                  addSourceTab === "upload" ? "bg-ink text-surface border-ink" : "bg-surface border-line"
                }`}
              >
                Unggah Berkas
              </button>
              <button
                type="button"
                onClick={() => setAddSourceTab("library")}
                className={`py-1.5 px-0.5 sm:px-1 text-[10px] sm:text-xs font-bold border truncate min-w-0 text-center ${
                  addSourceTab === "library" ? "bg-ink text-surface border-ink" : "bg-surface border-line"
                }`}
              >
                Pustaka Saya
              </button>
            </div>

            {/* 1. PUSTAKA BAWAAN */}
            {addSourceTab === "builtin" && (
              <div className="space-y-2 min-w-0">
                <input
                  type="text"
                  placeholder="Cari lagu bawaan (judul, mood, tema)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 px-2 border-2 border-line bg-surface text-xs min-w-0"
                />

                <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCat("all")}
                    className={`px-2 py-0.5 whitespace-nowrap border shrink-0 ${
                      selectedCat === "all" ? "bg-accent font-bold" : "bg-surface"
                    }`}
                  >
                    Semua
                  </button>
                  {AUDIO_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCat(cat.id)}
                      className={`px-2 py-0.5 whitespace-nowrap border shrink-0 ${
                        selectedCat === cat.id ? "bg-accent font-bold" : "bg-surface"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 min-w-0">
                  {filteredBuiltinTracks.map((t) => (
                    <div
                      key={t.id}
                      className="border border-line bg-surface p-2 flex items-center justify-between gap-1.5 sm:gap-2 text-xs min-w-0 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => togglePreview(t.src)}
                        className="h-6 w-6 shrink-0 border border-line flex items-center justify-center"
                      >
                        {previewState.activeSrc === t.src && previewState.isPlaying ? (
                          <Pause size={10} className="text-accent" />
                        ) : (
                          <Play size={10} />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="font-bold truncate">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {t.categoryLabel} · {t.mood}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBuiltinTrackToPlaylist(t)}
                        className="nb-btn min-h-7 px-1.5 sm:px-2 py-0 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Plus size={11} /> Tambah
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. UNGGAH BERKAS BARU */}
            {addSourceTab === "upload" && (
              <div className="space-y-3 min-w-0">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleUploadFiles(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-line bg-surface/50 p-3 sm:p-4 text-center cursor-pointer hover:bg-surface-elevated transition-colors min-w-0 overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="mx-auto text-muted-foreground mb-1 shrink-0" />
                  <p className="text-xs font-bold break-words">Tarik & lepas file audio di sini, atau klik untuk memilih</p>
                  <p className="text-[10px] text-muted-foreground mt-1 break-words">
                    Mendukung MP3, WAV, OGG, M4A/AAC hingga 15 MB per file.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUploadFiles(e.target.files)}
                  />
                </div>

                {isUploading && (
                  <div className="border border-line bg-yellow-50 p-2.5 space-y-1.5 text-xs min-w-0">
                    <div className="flex justify-between font-bold gap-2">
                      <span className="truncate min-w-0">{uploadStatus}</span>
                      <span className="shrink-0">{uploadProgressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-yellow-200 overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${uploadProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div role="alert" className="border-2 border-red-500 bg-red-50 p-2 text-xs text-red-700 font-bold break-words">
                    {uploadError}
                  </div>
                )}
              </div>
            )}

            {/* 3. PUSTAKA SAYA */}
            {addSourceTab === "library" && (
              <div className="space-y-2 min-w-0">
                {loadingUserLibrary ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Memuat pustaka audio Anda…</p>
                ) : userLibraryError ? (
                  <p className="text-xs text-red-500 break-words">{userLibraryError}</p>
                ) : userLibrary.length === 0 ? (
                  <div className="border border-dashed border-line p-3 sm:p-4 text-center text-xs text-muted-foreground break-words">
                    Belum ada audio yang tersimpan di pustaka akun Anda. Unggah berkas baru untuk menyimpannya.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 min-w-0">
                    {userLibrary.map((track) => (
                      <div
                        key={track.id}
                        className="border border-line bg-surface p-2 flex items-center justify-between gap-1.5 sm:gap-2 text-xs min-w-0 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => togglePreview(track.src)}
                          className="h-6 w-6 shrink-0 border border-line flex items-center justify-center"
                        >
                          {previewState.activeSrc === track.src && previewState.isPlaying ? (
                            <Pause size={10} className="text-accent" />
                          ) : (
                            <Play size={10} />
                          )}
                        </button>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-bold truncate">{track.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {formatAudioTime(track.duration)} · {(track.sizeBytes ? (track.sizeBytes / 1024 / 1024).toFixed(1) : 0)} MB
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => addUserTrackToPlaylist(track)}
                            className="nb-btn min-h-7 px-1.5 sm:px-2 py-0 text-[10px] sm:text-[11px] font-bold shrink-0"
                          >
                            + Pakai
                          </button>
                          {track.storagePath && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Hapus permanen "${track.title}" dari penyimpanan cloud?`)) {
                                  await deleteUploadedAudioAction(track.storagePath!);
                                  setUserLibrary((prev) => prev.filter((t) => t.id !== track.id));
                                }
                              }}
                              className="h-7 w-7 border border-line text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                              title="Hapus dari penyimpanan cloud"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PLAYBACK CONTROLS */}
      {/* ======================================================== */}
      {studioTab === "playback" && (
        <div className="space-y-4 text-xs">
          {/* VOLUME SLIDER */}
          <div className="border border-line bg-surface p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={volId} className="font-bold">
                Volume Suara ({audio.volume}%)
              </label>
              <button
                type="button"
                onClick={() => onChange({ volume: 35 })}
                className="text-[10px] underline text-muted-foreground hover:text-ink"
              >
                Reset Default (35%)
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Volume2 size={16} />
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
                className="h-2 w-full accent-accent cursor-pointer"
              />
            </div>
          </div>

          {/* MODE AUTOPLAY / START */}
          <div>
            <span className={legend}>Perilaku Memulai Musik (Autoplay)</span>
            <div className="space-y-1.5">
              {[
                {
                  id: "first_interaction",
                  label: "Mulai saat Interaksi Pertama (Rekomendasi)",
                  desc: "Memulai audio otomatis begitu responden mengetuk atau menggulir halaman. Sesuai dengan semua kebijakan browser.",
                },
                {
                  id: "autoplay_immediate",
                  label: "Autoplay Segera saat Halaman Dibuka",
                  desc: "Mencoba autoplay langsung. Jika diblokir oleh browser responden, sistem otomatis menampilkan prompt interaksi.",
                },
                {
                  id: "manual_play",
                  label: "Tombol Putar Manual",
                  desc: "Tidak memulai audio sendiri; responden harus menekan tombol Play untuk mendengarkan.",
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`border border-line p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors ${
                    audio.startMode === opt.id ? "bg-accent/15 border-accent font-bold" : "bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="startMode"
                    value={opt.id}
                    checked={audio.startMode === opt.id}
                    onChange={() => onChange({ startMode: opt.id as AudioStartMode })}
                    className="mt-0.5 accent-[#3457ff]"
                  />
                  <div>
                    <span className="block">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground font-normal leading-tight block mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* MODE PENGULANGAN (LOOP MODE) */}
          <div className="min-w-0">
            <span className={legend}>Mode Pengulangan (Loop)</span>
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 min-w-0">
              {[
                { id: "repeat_all", label: "Ulang Semua", Icon: Repeat },
                { id: "repeat_one", label: "Ulang 1 Lagu", Icon: Repeat1 },
                { id: "none", label: "Putar Sekali", Icon: SkipForward },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ loopMode: opt.id as AudioLoopMode, loop: opt.id !== "none" })}
                  className={`border p-1.5 sm:p-2 text-center flex flex-col items-center gap-1 min-w-0 overflow-hidden ${
                    audio.loopMode === opt.id ? "border-accent bg-accent font-bold text-[color:var(--on-accent)]" : "border-line bg-surface"
                  }`}
                >
                  <opt.Icon size={14} className="shrink-0" />
                  <span className="truncate w-full text-[10px] sm:text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MODE URUTAN (PLAYBACK MODE) */}
          <div className="min-w-0">
            <span className={legend}>Urutan Pemutaran</span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onChange({ playbackMode: "sequential" })}
                className={`border p-1.5 sm:p-2 text-center flex items-center justify-center gap-1 min-w-0 overflow-hidden text-[10px] sm:text-xs ${
                  audio.playbackMode === "sequential" ? "border-accent bg-accent font-bold text-[color:var(--on-accent)]" : "border-line bg-surface"
                }`}
              >
                <ListMusic size={13} className="shrink-0" />
                <span className="truncate">Berurutan</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ playbackMode: "shuffle" })}
                className={`border p-1.5 sm:p-2 text-center flex items-center justify-center gap-1 min-w-0 overflow-hidden text-[10px] sm:text-xs ${
                  audio.playbackMode === "shuffle" ? "border-accent bg-accent font-bold text-[color:var(--on-accent)]" : "border-line bg-surface"
                }`}
              >
                <Shuffle size={13} className="shrink-0" />
                <span className="truncate">Acak (Shuffle)</span>
              </button>
            </div>
          </div>

          {/* EFEK TRANSISI FADE IN / FADE OUT */}
          <div className="border border-line bg-surface p-3 space-y-3">
            <span className="font-bold block">Transisi Audio (Fade)</span>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={audio.fadeIn}
                    onChange={(e) => onChange({ fadeIn: e.target.checked })}
                    className="accent-[#3457ff]"
                  />
                  <span>Fade In saat audio dimulai</span>
                </span>
                {audio.fadeIn && (
                  <span className="nb-mono text-[11px] font-bold">{audio.fadeInDuration} detik</span>
                )}
              </label>
              {audio.fadeIn && (
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={audio.fadeInDuration}
                  onChange={(e) => onChange({ fadeInDuration: Number(e.target.value) })}
                  className="w-full h-1.5 accent-accent"
                />
              )}

              <label className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={audio.fadeOut}
                    onChange={(e) => onChange({ fadeOut: e.target.checked })}
                    className="accent-[#3457ff]"
                  />
                  <span>Fade Out sebelum audio dihentikan</span>
                </span>
                {audio.fadeOut && (
                  <span className="nb-mono text-[11px] font-bold">{audio.fadeOutDuration} detik</span>
                )}
              </label>
              {audio.fadeOut && (
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={audio.fadeOutDuration}
                  onChange={(e) => onChange({ fadeOutDuration: Number(e.target.value) })}
                  className="w-full h-1.5 accent-accent"
                />
              )}
            </div>
          </div>

          {/* PENGATURAN LANJUTAN */}
          <div className="space-y-2 border-t border-line pt-3">
            <span className={legend}>Pengaturan Tambahan</span>

            <label className={choice}>
              <input
                type="checkbox"
                className={box}
                checked={audio.pauseOnTabSwitch}
                onChange={(e) => onChange({ pauseOnTabSwitch: e.target.checked })}
              />
              <div>
                <span className="font-bold">Jeda saat tab tidak aktif</span>
                <p className={hint}>Audio otomatis berhenti saat responden berpindah tab atau jendela lain.</p>
              </div>
            </label>

            <label className={choice}>
              <input
                type="checkbox"
                className={box}
                checked={audio.stopOnSubmit}
                onChange={(e) => onChange({ stopOnSubmit: e.target.checked })}
              />
              <div>
                <span className="font-bold">Hentikan saat form terkirim</span>
                <p className={hint}>Musik otomatis berhenti saat responden berhasil mengirim jawaban formulir.</p>
              </div>
            </label>

            <label className={choice}>
              <input
                type="checkbox"
                className={box}
                checked={audio.sfxEnabled}
                onChange={(e) => onChange({ sfxEnabled: e.target.checked })}
              />
              <div>
                <span className="font-bold">Efek Suara Mikro-Interaksi (SFX)</span>
                <p className={hint}>Suara sentuhan taktil saat responden memilih opsi jawaban atau pindah halaman.</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CUSTOM AUDIO PLAYER STYLES */}
      {/* ======================================================== */}
      {studioTab === "player" && (
        <div className="space-y-4 text-xs min-w-0">
          {/* MODE TAMPILAN PLAYER */}
          <div className="min-w-0">
            <span className={legend}>Gaya Pemutar Audio</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
              {[
                { id: "floating_pill", label: "Floating Mini Pill", desc: "Pil mengambang di sudut layar" },
                { id: "bottom_dock", label: "Bottom Dock", desc: "Menempel penuh di dasar layar" },
                { id: "expanded_panel", label: "Expanded Panel", desc: "Panel lengkap dengan playlist" },
                { id: "minimal_icon", label: "Minimal Icon", desc: "Hanya tombol putar mungil" },
                { id: "custom_brand", label: "Custom Theme", desc: "Mengikuti warna tema formulir" },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onChange({ playerStyle: style.id as AudioPlayerStyle })}
                  className={`border-2 p-2 sm:p-2.5 text-left transition-all min-w-0 overflow-hidden ${
                    audio.playerStyle === style.id
                      ? "border-accent bg-accent/15 font-bold shadow-[2px_2px_0px_#000]"
                      : "border-line bg-surface"
                  }`}
                >
                  <span className="block font-bold truncate text-[11px] sm:text-xs">{style.label}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 line-clamp-2">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* POSISI PLAYER */}
          {audio.playerStyle !== "bottom_dock" && (
            <div className="min-w-0">
              <span className={legend}>Posisi Penempatan di Layar</span>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
                {[
                  { id: "bottom_right", label: "Sudut Kanan Bawah" },
                  { id: "bottom_left", label: "Sudut Kiri Bawah" },
                  { id: "top_right", label: "Sudut Kanan Atas" },
                  { id: "top_left", label: "Sudut Kiri Atas" },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onChange({ playerPosition: pos.id as AudioPlayerPosition })}
                    className={`border p-1.5 sm:p-2 text-center min-w-0 overflow-hidden text-[10px] sm:text-xs truncate ${
                      audio.playerPosition === pos.id ? "border-accent bg-accent font-bold text-[color:var(--on-accent)]" : "border-line bg-surface"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KONTROL VISIBILITAS ELEMEN */}
          <div className="border border-line bg-surface p-2.5 sm:p-3 space-y-2 min-w-0">
            <span className="font-bold block text-xs">Visibilitas Kontrol untuk Responden</span>
            <p className="text-[10px] text-muted-foreground">
              Tentukan elemen apa saja yang boleh dilihat dan digunakan responden pada player.
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 min-w-0">
              {[
                ["showTitle", "Judul Lagu"],
                ["showArtist", "Nama Artis"],
                ["showProgress", "Seekbar & Durasi"],
                ["showVolume", "Slider Volume"],
                ["showPlaylist", "Tombol Playlist"],
                ["showCloseButton", "Tombol Tutup"],
              ].map(([key, label]) => {
                const currentVis = audio.visibility || {
                  showTitle: true,
                  showArtist: true,
                  showProgress: true,
                  showVolume: true,
                  showPlaylist: true,
                  showCloseButton: true,
                };
                const isChecked = !!(currentVis as Record<string, boolean>)[key];

                return (
                  <label key={key} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        onChange({
                          visibility: {
                            ...currentVis,
                            [key]: e.target.checked,
                          },
                        });
                      }}
                      className="accent-[#3457ff] shrink-0"
                    />
                    <span className="truncate text-[10px] sm:text-xs">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* TEMA WARNA PLAYER */}
          <div className="min-w-0">
            <span className={legend}>Mode Warna Player</span>
            <div className="grid grid-cols-3 gap-1 sm:gap-2 min-w-0">
              {[
                { id: "match_form", label: "Tema Form" },
                { id: "light", label: "Terang" },
                { id: "dark", label: "Gelap" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      playerTheme: {
                        ...(audio.playerTheme || { mode: "match_form" }),
                        mode: m.id as "match_form" | "light" | "dark" | "custom",
                      },
                    })
                  }
                  className={`border p-1.5 sm:p-2 text-center min-w-0 overflow-hidden text-[10px] sm:text-xs truncate ${
                    audio.playerTheme?.mode === m.id ? "border-accent bg-accent font-bold text-[color:var(--on-accent)]" : "border-line bg-surface"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: STUDIO LIVE PREVIEW */}
      {/* ======================================================== */}
      {studioTab === "preview" && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="font-bold flex items-center gap-1.5">
              <Eye size={14} /> Simulasi Responden
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2 py-0.5 border text-[11px] ${
                  previewDevice === "mobile" ? "bg-accent font-bold" : "bg-surface"
                }`}
              >
                Ponsel
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2 py-0.5 border text-[11px] ${
                  previewDevice === "desktop" ? "bg-accent font-bold" : "bg-surface"
                }`}
              >
                Desktop
              </button>
            </div>
          </div>

          <div
            className={`mx-auto border-3 border-line bg-surface-elevated p-4 shadow-[4px_4px_0px_#000] relative overflow-hidden transition-all ${
              previewDevice === "mobile" ? "max-w-[280px] min-h-[360px]" : "w-full min-h-[260px]"
            }`}
          >
            {/* Simulasi Mockup Formulir */}
            <div className="opacity-40 pointer-events-none select-none space-y-2 mb-8">
              <div className="h-4 bg-line/60 w-3/4 rounded-sm" />
              <div className="h-2 bg-line/40 w-1/2 rounded-sm" />
              <div className="border border-line/50 p-2 rounded-sm space-y-1">
                <div className="h-2.5 bg-line/50 w-2/3" />
                <div className="h-4 bg-line/20 w-full" />
              </div>
            </div>

            {/* Simulasi Player Mengambang */}
            <div className="mt-6 border-2 border-line bg-surface p-2.5 shadow-[3px_3px_0px_#000] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const first = currentPlaylist[0];
                    if (first) togglePreview(first.src);
                  }}
                  className="h-8 w-8 border border-line bg-accent text-[color:var(--on-accent)] flex items-center justify-center font-bold"
                >
                  {previewState.isPlaying ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-[11px]">
                    {currentPlaylist[0]?.title || "Musik Latar"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Volume {audio.volume}% · {audio.loopMode}
                  </p>
                </div>
              </div>

              {previewState.isPlaying && (
                <div className="w-full h-1 bg-line/30 overflow-hidden">
                  <div className="h-full bg-accent animate-pulse w-1/2" />
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">
              Uji coba audio langsung: gunakan tombol play di atas untuk mendengar sampel pada volume {audio.volume}%.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

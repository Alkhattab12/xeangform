"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Disc,
  Headphones,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  fadeAudioGain,
  formatAudioTime,
  volumeToGain,
} from "@/lib/audio/engine";
import { isSafeAudioSrc } from "@/lib/audio/safe-src";
import {
  resolvePlaylistTracks,
  type AudioSettings,
  type PlaylistTrack,
  type ThemePreset,
} from "@/lib/forms/schema";

type Props = {
  audioSettings: AudioSettings;
  themePreset?: ThemePreset | null;
  formSubmitted?: boolean;
};

export function MiniAudioPlayer({
  audioSettings,
  themePreset = "neo",
  formSubmitted = false,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelFadeRef = useRef<(() => void) | null>(null);

  // Daftar putar
  const playlist = useMemo(
    () => resolvePlaylistTracks(audioSettings).filter((t) => isSafeAudioSrc(t.src)), // abaikan http://, data:, dst.
    [audioSettings]
  );

  // Status index lagu & shuffle
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(
    audioSettings.playbackMode === "shuffle"
  );
  const [loopMode, setLoopMode] = useState(audioSettings.loopMode || "repeat_all");

  // Status playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(audioSettings.volume);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Status UI
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const activeTrack: PlaylistTrack | undefined =
    playlist[currentIndex] || playlist[0];

  // Cek prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Deteksi mengetik agar player mengecil dan tidak menutupi input di perangkat mobile
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true")
      ) {
        setIsTyping(true);
      }
    };
    const handleFocusOut = () => {
      setIsTyping(false);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Transisi fade audio helper
  const cancelOngoingFade = () => {
    if (cancelFadeRef.current) {
      cancelFadeRef.current();
      cancelFadeRef.current = null;
    }
  };

  // Navigasi ke lagu berikutnya
  const playNextTrack = useCallback(() => {
    if (playlist.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (isShuffle) {
      let nextIdx = Math.floor(Math.random() * playlist.length);
      if (nextIdx === currentIndex && playlist.length > 1) {
        nextIdx = (currentIndex + 1) % playlist.length;
      }
      setCurrentIndex(nextIdx);
    } else {
      if (currentIndex + 1 < playlist.length) {
        setCurrentIndex(currentIndex + 1);
      } else if (loopMode === "repeat_all") {
        setCurrentIndex(0);
      } else {
        // Mode none: berhenti di akhir playlist
        setIsPlaying(false);
      }
    }
  }, [playlist.length, currentIndex, isShuffle, loopMode]);

  // Navigasi ke lagu sebelumnya
  const playPrevTrack = useCallback(() => {
    if (playlist.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // Jika sudah berjalan lebih dari 3 detik, restart lagu saat ini
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : playlist.length - 1));
  }, [playlist.length]);

  // Inisialisasi Audio Element & Event Handlers
  useEffect(() => {
    if (!activeTrack?.src) return;

    cancelOngoingFade();

    const audio = new Audio();
    audioRef.current = audio;
    audio.src = activeTrack.src;
    audio.preload = "metadata";
    audio.loop = loopMode === "repeat_one";

    const targetGain = isMuted ? 0 : volumeToGain(volume);
    audio.volume = targetGain;

    audio.onplay = () => {
      setIsPlaying(true);
      setAudioError(null);
      setAutoplayBlocked(false);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.onended = () => {
      if (loopMode === "repeat_one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextTrack();
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (activeTrack.duration) {
        setDuration(activeTrack.duration);
      }
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setAudioError(`Gagal memuat lagu "${activeTrack.title}".`);
      // Jika playlist memiliki lagu lain, lewati otomatis setelah 2 detik
      if (playlist.length > 1) {
        setTimeout(() => {
          playNextTrack();
        }, 2000);
      }
    };

    // Jika sebelumnya sudah dalam status playing, lanjutkan di track baru
    if (isPlaying) {
      if (audioSettings.fadeIn) {
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            cancelFadeRef.current = fadeAudioGain(
              audio,
              0,
              targetGain,
              audioSettings.fadeInDuration || 2
            );
          })
          .catch(() => {
            setIsPlaying(false);
          });
      } else {
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }

    return () => {
      cancelOngoingFade();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [activeTrack?.src, loopMode, playNextTrack]);

  // Autoplay compliance & Trigger Pemutaran
  useEffect(() => {
    if (hasInteracted || isPlaying || formSubmitted) return;

    const startMode = audioSettings.startMode || "first_interaction";

    // Mode Autoplay Segera (Immediate)
    if (startMode === "autoplay_immediate") {
      if (audioRef.current) {
        const targetGain = isMuted ? 0 : volumeToGain(volume);
        if (audioSettings.fadeIn) {
          audioRef.current.volume = 0;
        } else {
          audioRef.current.volume = targetGain;
        }

        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
            if (audioSettings.fadeIn && audioRef.current) {
              cancelFadeRef.current = fadeAudioGain(
                audioRef.current,
                0,
                targetGain,
                audioSettings.fadeInDuration || 2
              );
            }
          })
          .catch(() => {
            // Autoplay dengan suara ditolak browser
            setAutoplayBlocked(true);
          });
      }
    }

    // Mode First Interaction (Direkomendasikan)
    if (startMode === "first_interaction") {
      const handleUserGesture = () => {
        setHasInteracted(true);
        if (audioRef.current && !isPlaying && !formSubmitted) {
          const targetGain = isMuted ? 0 : volumeToGain(volume);
          if (audioSettings.fadeIn) {
            audioRef.current.volume = 0;
          } else {
            audioRef.current.volume = targetGain;
          }

          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              setAutoplayBlocked(false);
              if (audioSettings.fadeIn && audioRef.current) {
                cancelFadeRef.current = fadeAudioGain(
                  audioRef.current,
                  0,
                  targetGain,
                  audioSettings.fadeInDuration || 2
                );
              }
            })
            .catch(() => {
              // Jika masih ditolak, biarkan tombol play interaktif muncul
              setAutoplayBlocked(true);
            });
        }
        cleanupGestures();
      };

      const cleanupGestures = () => {
        window.removeEventListener("pointerdown", handleUserGesture);
        window.removeEventListener("keydown", handleUserGesture);
        window.removeEventListener("touchstart", handleUserGesture);
      };

      window.addEventListener("pointerdown", handleUserGesture, { once: true });
      window.addEventListener("keydown", handleUserGesture, { once: true });
      window.addEventListener("touchstart", handleUserGesture, { once: true });

      return cleanupGestures;
    }
  }, [
    audioSettings.startMode,
    audioSettings.fadeIn,
    audioSettings.fadeInDuration,
    hasInteracted,
    isPlaying,
    formSubmitted,
    volume,
    isMuted,
  ]);

  // Jeda saat tab tidak aktif (Pause on Blur / Tab Switch)
  useEffect(() => {
    if (!audioSettings.pauseOnTabSwitch) return;

    let wasPlayingBeforeHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlaying && audioRef.current) {
          wasPlayingBeforeHidden = true;
          audioRef.current.pause();
        }
      } else {
        if (wasPlayingBeforeHidden && audioRef.current && !formSubmitted) {
          wasPlayingBeforeHidden = false;
          audioRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audioSettings.pauseOnTabSwitch, isPlaying, formSubmitted]);

  // Hentikan musik saat form dikirimkan
  useEffect(() => {
    if (formSubmitted && audioSettings.stopOnSubmit && audioRef.current) {
      cancelOngoingFade();
      if (audioSettings.fadeOut) {
        const currentGain = audioRef.current.volume;
        cancelFadeRef.current = fadeAudioGain(
          audioRef.current,
          currentGain,
          0,
          audioSettings.fadeOutDuration || 2,
          () => {
            audioRef.current?.pause();
            setIsPlaying(false);
          }
        );
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [formSubmitted, audioSettings.stopOnSubmit, audioSettings.fadeOut, audioSettings.fadeOutDuration]);

  // Sinkronisasi Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volumeToGain(volume);
    }
  }, [volume, isMuted]);

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    cancelOngoingFade();

    if (isPlaying) {
      if (audioSettings.fadeOut) {
        const currentGain = audioRef.current.volume;
        cancelFadeRef.current = fadeAudioGain(
          audioRef.current,
          currentGain,
          0,
          audioSettings.fadeOutDuration || 1.5,
          () => {
            audioRef.current?.pause();
            setIsPlaying(false);
          }
        );
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      const targetGain = isMuted ? 0 : volumeToGain(volume);
      if (audioSettings.fadeIn) {
        audioRef.current.volume = 0;
      } else {
        audioRef.current.volume = targetGain;
      }

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
          setAutoplayBlocked(false);
          if (audioSettings.fadeIn && audioRef.current) {
            cancelFadeRef.current = fadeAudioGain(
              audioRef.current,
              0,
              targetGain,
              audioSettings.fadeInDuration || 2
            );
          }
        })
        .catch(() => {
          setAudioError("Pemutaran audio diblokir oleh peramban.");
        });
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current && Number.isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Jika fitur tidak aktif atau sudah submit dan disuruh berhenti, sembunyikan
  if (!audioSettings.enabled) return null;
  if (formSubmitted && audioSettings.stopOnSubmit) return null;

  // Preset tema visual styling
  const presetKey = themePreset ?? "neo";
  const getThemeChassis = () => {
    const custom = audioSettings.playerTheme;
    if (custom?.mode === "light") {
      return "border-3 border-line bg-[#ffffff] text-[#171717] shadow-[4px_4px_0px_#171717]";
    }
    if (custom?.mode === "dark") {
      return "border-3 border-line bg-[#171717] text-[#f5f5f5] shadow-[4px_4px_0px_#3457ff]";
    }

    switch (presetKey) {
      case "abstrak":
        return "border-3 border-line bg-surface shadow-[4px_4px_0px_#000] font-mono tracking-tight";
      case "unik":
        return "border-3 border-line bg-[#D7FF38] text-ink shadow-[4px_4px_0px_#171717] rounded-xl";
      case "imut":
        return "border-2 border-line bg-surface rounded-2xl shadow-[3px_3px_0px_#ffb3d9] text-ink";
      case "cooking":
        return "border-2 border-[#8B5A2B] bg-[#FFF8EE] text-[#4A2E12] shadow-[3px_3px_0px_#8B5A2B] rounded-lg";
      case "galaxy":
        return "border-2 border-[#00e5ff] bg-[#0c1022] text-[#e0f7fa] shadow-[0_0_14px_rgba(0,229,255,0.4)] rounded-md";
      case "kebumian":
        return "border-2 border-[#4A6741] bg-[#F4F6F0] text-[#2D3E28] shadow-[3px_3px_0px_#4A6741] rounded-md";
      case "biologi":
        return "border-2 border-[#00897B] bg-[#E0F2F1] text-[#004D40] shadow-[2px_2px_0px_#00897B] font-mono";
      case "sosial":
        return "border-2 border-line bg-surface shadow-[3px_3px_0px_#FF6B35] rounded-xl";
      case "keren":
        return "border-2 border-line bg-surface/90 backdrop-blur-md shadow-[4px_4px_0px_#3457ff] rounded-lg";
      case "neo":
      default:
        return "border-3 border-line bg-surface text-ink shadow-[4px_4px_0px_#171717]";
    }
  };

  // Posisi wrapper container
  const position = audioSettings.playerPosition || "bottom_right";
  const getPositionClass = () => {
    if (audioSettings.playerStyle === "bottom_dock" || position === "bottom_dock") {
      return "fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-3 pb-2 pt-1 sm:pb-3 w-full";
    }
    switch (position) {
      case "top_left":
        return "fixed top-2 left-2 right-2 sm:right-auto sm:top-3 sm:left-3 z-40 max-w-[calc(100vw-1rem)] sm:max-w-sm";
      case "top_right":
        return "fixed top-2 left-2 right-2 sm:left-auto sm:top-3 sm:right-3 z-40 max-w-[calc(100vw-1rem)] sm:max-w-sm";
      case "bottom_left":
        return "fixed bottom-2 left-2 right-2 sm:right-auto sm:bottom-4 sm:left-4 z-40 max-w-[calc(100vw-1rem)] sm:max-w-sm";
      case "bottom_right":
      default:
        return "fixed bottom-2 left-2 right-2 sm:left-auto sm:bottom-4 sm:right-4 z-40 max-w-[calc(100vw-1rem)] sm:max-w-sm";
    }
  };

  const vis = audioSettings.visibility || {
    showTitle: true,
    showArtist: true,
    showProgress: true,
    showVolume: true,
    showPlaylist: true,
    showCloseButton: true,
  };

  const renderVisualizer = () => {
    const bars = [40, 80, 50, 95];
    return (
      <div className="flex h-3.5 sm:h-4 items-end gap-0.5 shrink-0" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-0.5 sm:w-1 rounded-sm bg-current transition-all duration-150 ${
              isPlaying && !reducedMotion ? "animate-pulse" : ""
            }`}
            style={{
              height: isPlaying ? `${h}%` : "25%",
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    );
  };

  // Jika responden sengaja menutup player, berikan tombol buka kembali minimalis yang aksesibel
  if (isDismissed) {
    return (
      <aside aria-label="Buka kembali pemutar musik" className={getPositionClass()}>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className={`flex h-8 sm:h-9 items-center gap-1.5 px-2.5 sm:px-3 font-bold text-xs ${getThemeChassis()}`}
        >
          <Headphones size={14} />
          <span>Musik</span>
          {isPlaying && <span className="h-2 w-2 rounded-full bg-accent animate-ping" />}
        </button>
      </aside>
    );
  }

  const isDock = audioSettings.playerStyle === "bottom_dock" || position === "bottom_dock";
  const isMinimal = audioSettings.playerStyle === "minimal_icon";
  const isExpandedMode = audioSettings.playerStyle === "expanded_panel";

  return (
    <aside
      aria-label="Pemutar musik latar"
      className={`${getPositionClass()} transition-opacity duration-300 ${
        isTyping ? "pointer-events-none opacity-25 hover:opacity-100 hover:pointer-events-auto" : "opacity-100"
      }`}
    >
      {/* Banner Notifikasi Autoplay Ditolak Browser */}
      {autoplayBlocked && !isPlaying && (
        <div
          role="status"
          className="mb-2 flex items-center justify-between gap-2 border-2 border-line bg-accent p-2 text-xs font-bold text-[color:var(--on-accent)] shadow-[3px_3px_0px_#000] min-w-0"
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <Headphones size={14} className="shrink-0" />
            <span className="truncate">Ketuk untuk putar musik</span>
          </span>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-7 items-center gap-1 bg-surface px-2.5 text-ink border border-line active:scale-95 shrink-0"
          >
            <Play size={12} /> Putar
          </button>
        </div>
      )}

      {/* 1. MINIMAL ICON MODE */}
      {isMinimal ? (
        <div className={`flex items-center gap-1.5 p-1.5 min-w-0 ${getThemeChassis()}`}>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Jeda musik latar" : "Putar musik latar"}
            className="flex h-9 w-9 items-center justify-center border-2 border-current transition-transform active:scale-95 shrink-0"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Batal bisukan musik" : "Bisukan musik"}
            className="flex h-9 w-9 items-center justify-center border-2 border-current hover:opacity-80 shrink-0"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          {vis.showCloseButton && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Tutup pemutar musik"
              className="flex h-7 w-7 items-center justify-center opacity-60 hover:opacity-100 shrink-0"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        /* 2. STANDARD / COMPACT / EXPANDED PLAYER */
        <div className={`p-2 sm:p-3 transition-all w-full max-w-full min-w-0 overflow-hidden ${getThemeChassis()}`}>
          <div className="flex items-center justify-between gap-1 sm:gap-2.5 min-w-0">
            {/* Playlist Previous Track */}
            {playlist.length > 1 && (
              <button
                type="button"
                onClick={playPrevTrack}
                aria-label="Lagu sebelumnya"
                className="flex h-7 w-7 shrink-0 items-center justify-center opacity-70 hover:opacity-100 active:scale-95"
              >
                <SkipBack size={13} />
              </button>
            )}

            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Jeda musik latar" : "Putar musik latar"}
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center border-2 border-current transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            {/* Playlist Next Track */}
            {playlist.length > 1 && (
              <button
                type="button"
                onClick={playNextTrack}
                aria-label="Lagu berikutnya"
                className="flex h-7 w-7 shrink-0 items-center justify-center opacity-70 hover:opacity-100 active:scale-95"
              >
                <SkipForward size={13} />
              </button>
            )}

            {/* Visualizer & Track Info */}
            <div
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 sm:gap-2 overflow-hidden"
              onClick={() => setIsExpanded((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded((prev) => !prev);
                }
              }}
              aria-expanded={isExpanded}
              aria-label="Detail audio & pengaturan volume"
            >
              {renderVisualizer()}
              <div className="min-w-0 flex-1 overflow-hidden">
                {vis.showTitle && (
                  <p className="truncate text-[11px] sm:text-xs font-bold leading-tight">
                    {activeTrack?.title || "Musik Latar"}
                  </p>
                )}
                {vis.showArtist && (
                  <p className="truncate text-[9px] sm:text-[10px] opacity-75">
                    {activeTrack?.artist || "Xeangform Sound"}
                    {playlist.length > 1 ? ` (${currentIndex + 1}/${playlist.length})` : ""}
                    {" · "}
                    {formatAudioTime(currentTime)}
                  </p>
                )}
              </div>
            </div>

            {/* Mute Button */}
            {vis.showVolume && (
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Batal bisukan suara" : "Bisukan suara"}
                className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center border-2 border-current transition-transform active:scale-95"
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            )}

            {/* Playlist Drawer Toggle */}
            {playlist.length > 1 && vis.showPlaylist && (
              <button
                type="button"
                onClick={() => setShowPlaylistDrawer((prev) => !prev)}
                aria-label="Daftar lagu playlist"
                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center border-2 border-current ${
                  showPlaylistDrawer ? "bg-current text-surface" : "opacity-75 hover:opacity-100"
                }`}
              >
                <ListMusic size={13} />
              </button>
            )}

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? "Tutup panel volume" : "Buka panel volume"}
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center opacity-70 hover:opacity-100"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {/* Dismiss Button */}
            {vis.showCloseButton && (
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                aria-label="Sembunyikan pemutar musik"
                className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center opacity-50 hover:opacity-100"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Progress Seekbar (jika showProgress aktif) */}
          {vis.showProgress && (isExpanded || isExpandedMode) && (
            <div className="mt-2 space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                aria-label="Posisi pemutaran lagu"
                className="h-1.5 w-full accent-current cursor-pointer"
              />
              <div className="flex justify-between text-[10px] opacity-75">
                <span>{formatAudioTime(currentTime)}</span>
                <span>{formatAudioTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Expanded Panel: Volume & Playlist Controls */}
          {(isExpanded || isExpandedMode) && (
            <div className="mt-2.5 border-t border-current/20 pt-2 space-y-2">
              {vis.showVolume && (
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold">Volume</span>
                    <span>{isMuted ? "0% (Bisukan)" : `${volume}%`}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    aria-label="Atur volume suara"
                    className="h-5 w-full accent-current cursor-pointer"
                  />
                </div>
              )}

              {/* Mode Bar (Shuffle & Loop) */}
              {playlist.length > 1 && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsShuffle((prev) => !prev)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 border border-current ${
                      isShuffle ? "bg-current text-surface font-bold" : "opacity-75"
                    }`}
                  >
                    <Shuffle size={11} /> Acak
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoopMode((prev) =>
                        prev === "repeat_all"
                          ? "repeat_one"
                          : prev === "repeat_one"
                          ? "none"
                          : "repeat_all"
                      );
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 border border-current font-bold"
                  >
                    {loopMode === "repeat_one" ? (
                      <>
                        <Repeat1 size={11} /> Ulang 1
                      </>
                    ) : loopMode === "repeat_all" ? (
                      <>
                        <Repeat size={11} /> Ulang Semua
                      </>
                    ) : (
                      "Putar Sekali"
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] opacity-75 pt-1">
                <span>{activeTrack?.license || "Bebas Royalti"}</span>
                <span>{audioSettings.pauseOnTabSwitch ? "Auto-jeda tab aktif" : ""}</span>
              </div>
            </div>
          )}

          {/* Playlist Drawer Popup */}
          {showPlaylistDrawer && playlist.length > 1 && (
            <div className="mt-3 border-t-2 border-current pt-2 max-h-48 overflow-y-auto space-y-1">
              <p className="text-[11px] font-bold mb-1">Daftar Lagu ({playlist.length}):</p>
              {playlist.map((track, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={track.id || idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowPlaylistDrawer(false);
                      setIsPlaying(true);
                    }}
                    className={`flex w-full items-center justify-between p-1.5 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-current text-surface font-bold"
                        : "hover:bg-current/10"
                    }`}
                  >
                    <span className="truncate flex-1">
                      {idx + 1}. {track.title}
                    </span>
                    <span className="text-[10px] opacity-75 ml-2">
                      {formatAudioTime(track.duration)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pesan Kesalahan jika ada */}
          {audioError && (
            <p className="mt-1 text-[11px] font-bold text-orange" role="alert">
              {audioError}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

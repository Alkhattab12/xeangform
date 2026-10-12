"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Disc,
  Headphones,
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatAudioTime, volumeToGain } from "@/lib/audio/engine";
import { BUILTIN_AUDIO_TRACKS } from "@/lib/audio/library";
import type { AudioSettings, ThemePreset } from "@/lib/forms/schema";

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

  // Status playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(audioSettings.volume);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioSettings.duration || 0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Sumber audio yang dapat diputar
  const resolvedSrc =
    audioSettings.customUrl ||
    BUILTIN_AUDIO_TRACKS.find((t) => t.id === audioSettings.trackId)?.src ||
    "/audio/tracks/lofi-focus.wav";

  // Cek prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Deteksi ketika responden sedang mengetik agar player mengecil dan tidak menutupi input
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

  // Inisialisasi audio element tunggal
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = resolvedSrc;
    audio.loop = audioSettings.loop;
    audio.preload = "metadata";
    audio.volume = isMuted ? 0 : volumeToGain(volume);

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      if (!audioSettings.loop) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setAudioError("Audio tidak dapat dimuat.");
    };

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [resolvedSrc, audioSettings.loop]);

  // Handle Autoplay Compliance (Mulai saat interaksi pertama)
  useEffect(() => {
    if (audioSettings.startMode !== "first_interaction" || hasInteracted || isPlaying) {
      return;
    }

    const startOnInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current && !isPlaying && !formSubmitted) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browser masih menolak, biarkan tombol play manual aktif
          });
      }
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };

    window.addEventListener("pointerdown", startOnInteraction, { once: true });
    window.addEventListener("keydown", startOnInteraction, { once: true });
    window.addEventListener("touchstart", startOnInteraction, { once: true });

    return cleanup;
  }, [audioSettings.startMode, hasInteracted, isPlaying, formSubmitted]);

  // Hentikan musik saat form dikirimkan jika stopOnSubmit aktif
  useEffect(() => {
    if (formSubmitted && audioSettings.stopOnSubmit && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [formSubmitted, audioSettings.stopOnSubmit]);

  // Terapkan perubahan volume dan mute seketika
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volumeToGain(volume);
    }
  }, [volume, isMuted]);

  // Fungsi kontrol
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
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

  if (!audioSettings.enabled) return null;
  // Jika sudah submit dan harus berhenti, sembunyikan player
  if (formSubmitted && audioSettings.stopOnSubmit) return null;

  // Preset tema CSS style helper
  const presetKey = themePreset ?? "neo";

  // Render visualizer bouncing bars
  const renderVisualizer = () => {
    const bars = [40, 80, 50, 95];
    return (
      <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-1 rounded-sm bg-current transition-all duration-150 ${
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

  // Posisi & layout berdasarkan playerStyle
  const isDock = audioSettings.playerStyle === "bottom_dock";
  const isHeader = audioSettings.playerStyle === "header_badge";
  const isMinimal = audioSettings.playerStyle === "minimal_icon";

  // Posisi wrapper container
  const positionClass = isDock
    ? "fixed bottom-0 left-0 right-0 z-40 px-3 pb-2 pt-1 sm:pb-3"
    : isHeader
    ? "fixed top-3 right-3 z-40 max-w-xs"
    : "fixed bottom-4 right-4 z-40 max-w-sm";

  // Tema-Spesifik Visual Styling
  const getThemeChassis = () => {
    switch (presetKey) {
      case "abstrak":
        return "border-3 border-line bg-surface shadow-[4px_4px_0px_#000] font-mono tracking-tight";
      case "unik":
        return "border-3 border-line bg-[#D7FF38] text-ink shadow-[4px_4px_0px_#171717] rounded-xl";
      case "imut":
        return "border-2 border-line bg-surface rounded-full shadow-[3px_3px_0px_#ffb3d9] text-ink";
      case "cooking":
        return "border-2 border-[#8B5A2B] bg-[#FFF8EE] text-[#4A2E12] shadow-[3px_3px_0px_#8B5A2B] rounded-lg";
      case "galaxy":
        return "border-2 border-[#00e5ff] bg-[#0c1022] text-[#e0f7fa] shadow-[0_0_12px_rgba(0,229,255,0.35)] rounded-md";
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

  return (
    <aside
      aria-label="Pemutar musik latar"
      className={`${positionClass} transition-opacity duration-300 ${
        isTyping ? "pointer-events-none opacity-25 hover:opacity-100 hover:pointer-events-auto" : "opacity-100"
      }`}
    >
      {/* MINIMAL ICON MODE */}
      {isMinimal ? (
        <div className={`flex items-center gap-1.5 p-1.5 ${getThemeChassis()}`}>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Jeda musik latar" : "Putar musik latar"}
            className="flex h-9 w-9 items-center justify-center border-2 border-current hover:opacity-80"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Batal bisukan musik" : "Bisukan musik"}
            className="flex h-9 w-9 items-center justify-center border-2 border-current hover:opacity-80"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      ) : (
        /* STANDARD MINI PLAYER (Pill, Header, or Bottom Dock) */
        <div className={`p-2.5 sm:p-3 transition-all ${getThemeChassis()}`}>
          <div className="flex items-center justify-between gap-2.5">
            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Jeda musik" : "Putar musik"}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-current transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            {/* Visualizer & Track Title */}
            <div
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
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
              aria-label="Detail audio & pengatur volume"
            >
              {renderVisualizer()}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold leading-tight">
                  {audioSettings.title || "Musik Latar"}
                </p>
                <p className="truncate text-[10px] opacity-75">
                  {audioSettings.artist || "Xeangform Audio"} · {formatAudioTime(currentTime)}
                </p>
              </div>
            </div>

            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Batal bisukan suara" : "Bisukan suara"}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-current transition-transform active:scale-95"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? "Tutup pengatur volume" : "Buka pengatur volume"}
              className="flex h-8 w-8 shrink-0 items-center justify-center opacity-70 hover:opacity-100"
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {/* Expanded Volume Slider & Controls */}
          {isExpanded && (
            <div className="mt-2.5 border-t border-current/25 pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
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
                aria-label="Atur volume musik latar"
                className="h-6 w-full accent-current cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] opacity-75">
                <span>{audioSettings.license || "Bebas Royalti"}</span>
                <span>{audioSettings.loop ? "Pengulangan Aktif" : "Putar Sekali"}</span>
              </div>
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

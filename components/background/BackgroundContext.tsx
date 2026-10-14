"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { saveBackgroundPreference } from "@/app/actions/auth";

export type BackgroundMode = "motion" | "static";

interface BackgroundContextType {
  mode: BackgroundMode;
  setMode: (mode: BackgroundMode) => void;
  toggleMode: () => void;
  isMounted: boolean;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

const STORAGE_KEY = "xeangform_bg_mode";

export function BackgroundProvider({
  children,
  initialMode = "motion",
}: {
  children: React.ReactNode;
  initialMode?: BackgroundMode;
}) {
  const [mode, setModeState] = useState<BackgroundMode>(initialMode);
  const [isMounted, setIsMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as BackgroundMode | null;
      if (saved === "motion" || saved === "static") {
        setModeState(saved);
        document.documentElement.setAttribute("data-bg-mode", saved);
        return;
      }

      // Jika belum ada preferensi, periksa preferensi sistem reduced motion
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const defaultMode: BackgroundMode = prefersReduced ? "static" : "motion";
      setModeState(defaultMode);
      document.documentElement.setAttribute("data-bg-mode", defaultMode);
    } catch {
      document.documentElement.setAttribute("data-bg-mode", "motion");
    }
  }, []);

  const setMode = (newMode: BackgroundMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      document.documentElement.setAttribute("data-bg-mode", newMode);
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }

    // Simpan sinkronisasi ke profil jika user terautentikasi
    startTransition(() => {
      saveBackgroundPreference(newMode).catch(() => {});
    });
  };

  const toggleMode = () => {
    const nextMode: BackgroundMode = mode === "motion" ? "static" : "motion";
    setMode(nextMode);
  };

  return (
    <BackgroundContext.Provider value={{ mode, setMode, toggleMode, isMounted }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  BG_ATTR,
  BG_STORAGE_KEY,
  DEFAULT_BG_MODE,
  parseBackgroundMode,
  resolveEffectiveMode,
  type BackgroundMode,
} from "@/lib/background/mode";

// ---- Penyimpanan pengaturan (satu sumber kebenaran, dibagikan ke semua komponen lewat useSyncExternalStore)
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readPref(): BackgroundMode {
  const fromAttr = parseBackgroundMode(document.documentElement.getAttribute(BG_ATTR));
  if (fromAttr) return fromAttr;
  try {
    return parseBackgroundMode(localStorage.getItem(BG_STORAGE_KEY)) ?? DEFAULT_BG_MODE;
  } catch {
    return DEFAULT_BG_MODE; // localStorage diblokir: pakai bawaan, aplikasi tetap jalan
  }
}

function subscribePref(cb: () => void) {
  listeners.add(cb);
  // Sinkronkan antar tab
  const onStorage = (e: StorageEvent) => {
    if (e.key !== BG_STORAGE_KEY) return;
    const m = parseBackgroundMode(e.newValue);
    if (m) document.documentElement.setAttribute(BG_ATTR, m);
    else document.documentElement.removeAttribute(BG_ATTR);
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type Ctx = {
  /** Pilihan pengguna. */
  pref: BackgroundMode;
  /** Mode yang benar-benar berlaku (reduced motion sistem selalu menghasilkan "diam"). */
  effective: BackgroundMode;
  reducedMotion: boolean;
  setPref: (m: BackgroundMode) => void;
};

const BackgroundContext = createContext<Ctx | null>(null);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const pref = useSyncExternalStore(subscribePref, readPref, () => DEFAULT_BG_MODE);
  const reducedMotion = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const setPref = useCallback((m: BackgroundMode) => {
    document.documentElement.setAttribute(BG_ATTR, m); // CSS langsung berubah, tanpa reload
    try {
      localStorage.setItem(BG_STORAGE_KEY, m);
    } catch {
      // gagal menyimpan: preferensi tetap berlaku di sesi ini
    }
    notify();
  }, []);

  // Jeda animasi saat tab tidak terlihat (hemat baterai/CPU)
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => (document.hidden ? root.setAttribute("data-bg-hidden", "1") : root.removeAttribute("data-bg-hidden"));
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      root.removeAttribute("data-bg-hidden");
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({ pref, effective: resolveEffectiveMode(pref, reducedMotion), reducedMotion, setPref }),
    [pref, reducedMotion, setPref],
  );
  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground(): Ctx {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error("useBackground harus dipakai di dalam <BackgroundProvider>.");
  return ctx;
}

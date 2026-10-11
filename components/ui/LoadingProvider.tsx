"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Mascot } from "./Mascot";

type Ctx = { setBusy: (key: string, busy: boolean) => void };
const LoadingCtx = createContext<Ctx>({ setBusy: () => {} });

export const useLoading = () => useContext(LoadingCtx);

/** Hook praktis: tandai satu proses sebagai "sibuk" selama `busy` true; otomatis dilepas saat selesai/unmount. */
export function useBusyOverlay(busy: boolean) {
  const { setBusy } = useLoading();
  const id = useId();
  useEffect(() => {
    setBusy(id, busy);
    return () => setBusy(id, false);
  }, [busy, id, setBusy]);
}

const SHOW_DELAY = 350; // proses cepat tidak memunculkan overlay
const MIN_VISIBLE = 600; // jika sudah tampil, tahan sebentar agar tidak berkedip

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const keys = useRef(new Set<string>());
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const shownAt = useRef(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    if (keys.current.size > 0) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (!visibleRef.current && !showTimer.current) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null;
          if (keys.current.size > 0) {
            visibleRef.current = true;
            shownAt.current = Date.now();
            setVisible(true);
          }
        }, SHOW_DELAY);
      }
    } else {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (visibleRef.current && !hideTimer.current) {
        const wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt.current));
        hideTimer.current = setTimeout(() => {
          hideTimer.current = null;
          if (keys.current.size === 0) {
            visibleRef.current = false;
            setVisible(false);
          }
        }, wait);
      }
    }
  }, []);

  const setBusy = useCallback(
    (key: string, busy: boolean) => {
      if (busy) keys.current.add(key);
      else keys.current.delete(key);
      sync();
    },
    [sync],
  );

  return (
    <LoadingCtx.Provider value={{ setBusy }}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4" role="status" aria-live="polite" aria-busy="true" aria-label="Sedang memproses, mohon tunggu">
          <div className="nb-panel nb-panel-strong nb-shadow w-full max-w-xs p-6 text-center" style={{ background: "#FFFFFF", color: "#171717", borderColor: "#171717", boxShadow: "5px 5px 0 #171717" }}>
            <Mascot />
          </div>
        </div>
      )}
    </LoadingCtx.Provider>
  );
}

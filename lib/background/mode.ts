// Pengaturan background global: satu sumber kebenaran untuk seluruh halaman.
// Nilai disimpan di localStorage dan DICERMINKAN ke atribut <html data-bg-motion> oleh skrip inisialisasi
// (dijalankan sebelum cat pertama), sehingga CSS langsung benar tanpa kedipan dan tanpa hydration mismatch.

export type BackgroundMode = "gerak" | "diam";

export const BG_STORAGE_KEY = "xf-bg-motion";
export const BG_ATTR = "data-bg-motion";
export const DEFAULT_BG_MODE: BackgroundMode = "gerak";

export function parseBackgroundMode(value: unknown): BackgroundMode | null {
  return value === "gerak" || value === "diam" ? value : null;
}

/** Mode yang BENAR-BENAR berlaku: preferensi sistem "kurangi gerakan" selalu menang. */
export function resolveEffectiveMode(pref: BackgroundMode, reducedMotion: boolean): BackgroundMode {
  return reducedMotion ? "diam" : pref;
}

/** Skrip inline untuk <head>. Gagal dengan tenang jika localStorage diblokir (mode privat, kebijakan browser). */
export const BG_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(BG_STORAGE_KEY)});if(m==="gerak"||m==="diam"){document.documentElement.setAttribute(${JSON.stringify(BG_ATTR)},m)}}catch(e){}})();`;

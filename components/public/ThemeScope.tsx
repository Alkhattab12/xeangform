import type { FormTheme } from "@/lib/forms/schema";
import { resolveTheme, themeStyle } from "@/lib/forms/theme";
import { DynamicDecor } from "./DynamicDecor";

/**
 * Menerapkan tema form (variabel CSS tervalidasi) pada satu pohon elemen. theme null = tampilan bawaan.
 * Jika tema memakai mode dinamis: latar tema dan elemen dekoratif bergerak (berhenti otomatis bila pengguna
 * memilih mode diam atau sistem meminta kurangi gerakan, lihat globals.css).
 */
export function ThemeScope({ theme, className, children }: { theme: FormTheme | null; className?: string; children: React.ReactNode }) {
  const r = theme ? resolveTheme(theme) : null;
  const dynamic = r?.motion === "dinamis";
  return (
    <div
      className={[className, dynamic ? "xf-dyn xf-dyn-live" : ""].filter(Boolean).join(" ") || undefined}
      data-decor={dynamic ? r!.decor : undefined}
      style={r ? themeStyle(r) : undefined}
    >
      {dynamic && <DynamicDecor />}
      {children}
    </div>
  );
}

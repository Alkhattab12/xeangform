import type { FormTheme } from "@/lib/forms/schema";
import { resolveTheme, themeStyle } from "@/lib/forms/theme";

/** Menerapkan tema form (variabel CSS tervalidasi) pada satu pohon elemen. theme null = tampilan bawaan. */
export function ThemeScope({ theme, className, children }: { theme: FormTheme | null; className?: string; children: React.ReactNode }) {
  const style = theme ? themeStyle(resolveTheme(theme)) : undefined;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

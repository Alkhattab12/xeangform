"use client";

import type { FormSettings } from "@/lib/forms/schema";

type Props = { settings: FormSettings; onChange: (patch: Partial<FormSettings>) => void };

const legend = "mb-2 block font-display font-bold";
const hint = "mt-1 text-sm leading-relaxed";
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";

export function FormSettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="nb-panel nb-panel-strong space-y-6 p-4">
      <p className="nb-mono">Pengaturan form</p>

      <fieldset>
        <legend className={legend}>Jenis form</legend>
        <label className={choice}>
          <input type="radio" name="s-mode" className={box} checked={!settings.quiz} onChange={() => onChange({ quiz: false })} />
          Form biasa
        </label>
        <label className={choice}>
          <input type="radio" name="s-mode" className={box} checked={settings.quiz} onChange={() => onChange({ quiz: true })} />
          Kuis (dinilai otomatis)
        </label>
        <p className={hint}>
          Mode kuis menambahkan &quot;Kunci jawaban&quot; di pengaturan tiap soal (pilihan tunggal, pilihan ganda, dropdown, jawaban singkat, angka). Setelah mengirim, responden langsung melihat &quot;Benar X dari Y soal&quot;. Soal tanpa kunci tidak ikut dinilai.
        </p>
      </fieldset>

      <fieldset>
        <legend className={legend}>Buka tab atau perangkat tambahan</legend>
        <label className={choice}>
          <input type="radio" name="s-tab" className={box} checked={settings.allowTabSwitch} onChange={() => onChange({ allowTabSwitch: true })} />
          Boleh
        </label>
        <label className={choice}>
          <input type="radio" name="s-tab" className={box} checked={!settings.allowTabSwitch} onChange={() => onChange({ allowTabSwitch: false })} />
          Tidak boleh
        </label>
        <p className={hint}>
          Jika &quot;Tidak boleh&quot;, responden diperingatkan saat berpindah tab atau meminimalkan jendela, dan jumlahnya dicatat untuk kamu. Ini hanya mendeteksi di perangkat yang dipakai mengisi. Penggunaan perangkat lain tidak bisa dideteksi, dan deteksi bisa dihindari oleh yang paham teknis.
        </p>
      </fieldset>

      <div>
        <label className={choice}>
          <input
            type="checkbox"
            className={box}
            checked={settings.oneResponsePerAccount}
            onChange={(e) => onChange({ oneResponsePerAccount: e.target.checked })}
          />
          <span className="font-bold">Batasi 1 respons per akun</span>
        </label>
        <p className={hint}>
          Responden wajib masuk dengan akun. Akun yang sama tidak bisa mengisi lagi dan melihat pesan bahwa formulir sudah selesai. Email akun responden terlihat olehmu di hasil.
        </p>
      </div>
    </div>
  );
}

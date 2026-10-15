// Uji mode dinamis tema. Jalankan: npx tsx --tsconfig tsconfig.json lib/forms/selftest-theme.ts
import assert from "node:assert/strict";
import { DECOR_KEYS, THEME_PRESETS, formThemeSchema, themeFromJson } from "./schema";
import { PRESETS, resolveTheme, themeStyle } from "./theme";

// ---- skema: field motion opsional, kompatibel dengan tema lama
assert.equal(formThemeSchema.safeParse({ preset: "galaxy", motion: "dinamis" }).success, true);
assert.equal(formThemeSchema.safeParse({ preset: "galaxy", motion: "diam" }).success, true);
assert.equal(formThemeSchema.safeParse({ preset: "galaxy", motion: "cepat" }).success, false, "nilai motion liar ditolak");
assert.equal(themeFromJson({ preset: "neo" })?.motion, undefined, "tema lama tanpa motion tetap valid");
assert.equal(themeFromJson({ preset: "neo", motion: "dinamis" })?.motion, "dinamis", "motion tidak terbuang saat dibaca");
assert.equal(resolveTheme({ preset: "neo" }).motion, "diam", "bawaan = diam (form lama tidak berubah)");
assert.equal(resolveTheme({ preset: "neo", motion: "dinamis" }).motion, "dinamis");

const get = (o: object, k: string) => (o as Record<string, unknown>)[k];

// ---- statis: perilaku lama tidak berubah (dekorasi langsung di latar, tanpa variabel gerak)
const stat = themeStyle(resolveTheme({ preset: "galaxy" }));
assert.ok(get(stat, "backgroundImage"), "mode diam: dekorasi tetap di latar");
assert.equal(get(stat, "--xf-decor-anim"), undefined);
assert.equal(get(stat, "--accent-2"), PRESETS.galaxy.tokens.accent2);

// ---- dinamis: dekorasi pindah ke lapisan bergerak
const dyn = themeStyle(resolveTheme({ preset: "galaxy", motion: "dinamis" }));
assert.equal(get(dyn, "backgroundImage"), undefined, "tidak melukis dekorasi dua kali");
assert.match(String(get(dyn, "--xf-decor-anim")), /^xf-pan 45s linear infinite$/);
assert.equal(get(dyn, "--xf-tile-x"), "260px");
assert.equal(get(dyn, "--xf-pad-x"), "260px");
assert.ok(String(get(dyn, "--xf-decor-image")).includes("radial-gradient"));

// ---- setiap dekorasi punya gerak yang valid (loop mulus: pad = jarak geser)
for (const decor of DECOR_KEYS) {
  const v = themeStyle(resolveTheme({ preset: "neo", decor, motion: "dinamis" }));
  const anim = String(get(v, "--xf-decor-anim"));
  if (decor === "none") {
    assert.equal(anim, "none");
    assert.equal(get(v, "--xf-decor-image"), "none");
  } else if (decor === "shapes" || decor === "bubbles") {
    assert.match(anim, /^xf-float /);
    assert.equal(get(v, "--xf-pad-x"), "0px");
  } else {
    assert.match(anim, /^xf-pan \d+s linear infinite$/);
    assert.equal(get(v, "--xf-pad-x"), get(v, "--xf-tile-x"), `${decor}: pad harus sama dengan jarak geser`);
    assert.equal(get(v, "--xf-pad-y"), get(v, "--xf-tile-y"));
  }
}

// ---- semua preset bisa dinamis tanpa error
for (const preset of THEME_PRESETS) {
  const v = themeStyle(resolveTheme({ preset, motion: "dinamis" }));
  assert.equal(get(v, "--accent-2"), PRESETS[preset].tokens.accent2, preset);
  assert.ok(get(v, "--xf-decor-anim"), preset);
}
console.log("semua uji tema dinamis lulus");

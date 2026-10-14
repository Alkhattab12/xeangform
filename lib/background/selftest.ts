// Jalankan: npx tsx --tsconfig tsconfig.json lib/background/selftest.ts
import assert from "node:assert/strict";
import vm from "node:vm";
import { BG_ATTR, BG_INIT_SCRIPT, BG_STORAGE_KEY, parseBackgroundMode, resolveEffectiveMode } from "./mode";

assert.equal(parseBackgroundMode("gerak"), "gerak");
assert.equal(parseBackgroundMode("diam"), "diam");
for (const bad of ["", "GERAK", "on", null, undefined, 1, {}]) assert.equal(parseBackgroundMode(bad), null);

// reduced motion SELALU menang, apa pun preferensinya
assert.equal(resolveEffectiveMode("gerak", true), "diam");
assert.equal(resolveEffectiveMode("diam", true), "diam");
assert.equal(resolveEffectiveMode("gerak", false), "gerak");
assert.equal(resolveEffectiveMode("diam", false), "diam");

// Skrip inisialisasi dijalankan di sandbox dengan DOM/localStorage tiruan
function runInit(storage: unknown) {
  const attrs: Record<string, string> = {};
  const ctx = {
    localStorage: storage,
    document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
  };
  vm.runInNewContext(BG_INIT_SCRIPT, ctx);
  return attrs;
}
const store = (v: string | null) => ({ getItem: (k: string) => (k === BG_STORAGE_KEY ? v : null) });

assert.deepEqual(runInit(store("diam")), { [BG_ATTR]: "diam" });
assert.deepEqual(runInit(store("gerak")), { [BG_ATTR]: "gerak" });
assert.deepEqual(runInit(store(null)), {}); // belum ada preferensi: biarkan default CSS
assert.deepEqual(runInit(store("<script>")), {}); // nilai sampah diabaikan
// localStorage yang melempar error (mode privat/diblokir) tidak boleh merusak halaman
assert.doesNotThrow(() => runInit({ getItem: () => { throw new Error("SecurityError"); } }));
assert.doesNotThrow(() => runInit(undefined));

console.log("semua uji background lulus");

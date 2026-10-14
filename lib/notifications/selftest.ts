// Uji posisi panel notifikasi. Jalankan: npx tsx lib/notifications/selftest.ts
import assert from "node:assert/strict";
import { computePanelPlacement, PANEL_MARGIN } from "./placement";

// Lebar layar umum x posisi lonceng (kiri, kanan) dalam piksel CSS. Angka HP 360 diambil dari screenshot bug.
const cases: { vw: number; anchor: [number, number] }[] = [
  { vw: 320, anchor: [170, 210] },
  { vw: 360, anchor: [207, 247] }, // kasus screenshot: lonceng di kiri tombol "Keluar"
  { vw: 390, anchor: [225, 265] },
  { vw: 640, anchor: [250, 290] }, // sm: nama akun tampil, lonceng makin ke kiri
  { vw: 768, anchor: [330, 370] },
  { vw: 1280, anchor: [900, 940] },
  { vw: 1920, anchor: [1400, 1440] },
  { vw: 360, anchor: [10, 50] }, // lonceng sangat di kiri
  { vw: 360, anchor: [320, 356] }, // lonceng sangat di kanan
];

for (const { vw, anchor } of cases) {
  const [aL, aR] = anchor;
  const p = computePanelPlacement(aL, aR, vw);
  const screenLeft = aL + p.left;
  const screenRight = screenLeft + p.width;
  assert.ok(screenLeft >= PANEL_MARGIN - 1e-9, `vw=${vw}: panel keluar di kiri (${screenLeft})`);
  assert.ok(screenRight <= vw - PANEL_MARGIN + 1e-9, `vw=${vw}: panel keluar di kanan (${screenRight})`);
  assert.ok(p.width <= 420 && p.width > 0, `vw=${vw}: lebar tidak wajar (${p.width})`);
}

// Layar lebar: tetap rata kanan dengan lonceng dan selebar 420
const wide = computePanelPlacement(900, 940, 1280);
assert.equal(wide.width, 420);
assert.equal(900 + wide.left + wide.width, 940);

// Kasus bug: dulu panel selebar (360 - 32) dirapatkan ke kanan lonceng sehingga kirinya di 247 - 328 = -81 (keluar layar)
const bug = computePanelPlacement(207, 247, 360);
assert.equal(207 + bug.left, 16);

console.log("semua uji posisi panel lulus");

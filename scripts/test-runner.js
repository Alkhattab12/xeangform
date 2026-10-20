#!/usr/bin/env node
const { execSync } = require("node:child_process");

console.log("=== Syamil Form — Test Runner ===");

function run(cmd, desc) {
  console.log(`\n▶ [Menjalankan] ${desc}`);
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", env: process.env });
    console.log(`✓ [LULUS] ${desc}`);
  } catch (err) {
    console.error(`✗ [GAGAL] ${desc}`);
    process.exit(1);
  }
}

// 1. Linting integritas kode
run("node ./scripts/lint.js", "Linting & Verifikasi Berkas");

// 2. TypeScript Typecheck
run("./node_modules/.bin/tsc --noEmit", "TypeScript Full Typecheck (tsc --noEmit)");

// 3. Selftest Sistem Proctoring, Batas Waktu & Seeded Shuffle
run("npx tsx lib/forms/selftest-proctoring.ts", "Unit Selftest Anti-Cheating & Waktu");

// 4. Selftest Pembersihan Berkas Yatim
run("npx tsx --conditions react-server lib/forms/selftest-cleanup.ts", "Selftest Orphan File Cleanup");

// 5. Selftest Keamanan
run("npx tsx --conditions react-server lib/forms/selftest-security.ts", "Selftest Keamanan Audio & Storage");

// 6. Playwright Test Suite (Server & Browser E2E)
run("npx playwright test", "Playwright Full E2E Test Suite (Server, Browser, Proctoring, Timeout & Shuffle)");

console.log("\n=============================================");
console.log("🎉 SEMUA PENGUJIAN OTOMATIS BERHASIL (100%)");
console.log("=============================================\n");

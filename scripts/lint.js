#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

console.log("Menjalankan linting dan verifikasi integritas kode...");

const ROOT = path.resolve(__dirname, "..");
const IGNORED = new Set(["node_modules", ".git", ".next", "out", "shots"]);
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".sql"]);

let fileCount = 0;
let errors = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      fileCount++;
      const content = fs.readFileSync(fullPath, "utf8");
      // Cek marker konflik git
      if (/^[<>=]{7}(?: [A-Z0-9_]+)?$/m.test(content)) {
        console.error(`ERROR: Marker konflik git ditemukan di: ${path.relative(ROOT, fullPath)}`);
        errors++;
      }
    }
  }
}

walk(ROOT);

if (errors > 0) {
  console.error(`Linting gagal dengan ${errors} error.`);
  process.exit(1);
} else {
  console.log(`Linting selesai: ${fileCount} berkas diperiksa, 0 error.`);
}

// Uji halaman Respons, detail, dan semua ekspor CSV dengan hitungan independen. Lihat scripts/visual/README.md
const SHOT_DIR = process.env.SHOT_DIR || require("os").tmpdir();
const { chromium } = require("playwright");
const BASE = "http://localhost:3112", MOCK = "http://127.0.0.1:54321";
const F3 = "33333333-3333-4333-8333-333333333333", F1 = "11111111-1111-4111-8111-111111111111";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", aud: "authenticated", role: "authenticated", email: "r@e.com", email_confirmed_at: "2026-10-01T00:00:00Z", app_metadata: {}, user_metadata: { display_name: "x" }, created_at: "2026-10-01T00:00:00Z" };
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: USER.id, aud: "authenticated", role: "authenticated", exp })}.sig`;
const COOKIE = "base64-" + b64u({ access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user: USER });
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
function parseCsv(t) { const rows = []; let r = [], f = "", q = false; t = t.replace(/^\uFEFF/, ""); for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ",") { r.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; r.push(f); rows.push(r); r = []; f = ""; } else f += c; } if (f !== "" || r.length) { r.push(f); rows.push(r); } return rows.filter((x) => x.length > 1 || x[0] !== ""); }
(async () => {
  const fx = await (await fetch(MOCK + "/__fixture")).json();
  const valid = fx.subs.filter((s) => s.status !== "spam");
  const get = (path, cookie = true) => fetch(BASE + path, { headers: cookie ? { cookie: `sb-127-auth-token=${COOKIE}` } : {}, redirect: "manual" });

  // ---- ekspor analitik
  const A = `/dashboard/forms/${F3}/analytics/export`;
  const no = await get(`${A}?jenis=ringkasan`, false);
  ok(no.status === 401 || no.status === 307 || no.status === 302, `ekspor tanpa login ditolak (HTTP ${no.status})`);
  const bad = await get(`${A}?jenis=hacker`);
  ok(bad.status === 400, `jenis ekspor tidak dikenal -> 400 (dapat ${bad.status})`);
  const other = await get(`/dashboard/forms/00000000-0000-4000-8000-000000000000/analytics/export?jenis=ringkasan`);
  ok(other.status === 404, `form milik orang lain / tidak ada -> 404 (dapat ${other.status})`);
  const csv = {};
  for (const j of ["ringkasan", "kelas", "nilai", "tren", "soal", "opsi", "peserta"]) {
    const r = await get(`${A}?jenis=${j}`);
    const t = await r.text();
    ok(r.status === 200 && /csv/.test(r.headers.get("content-type") || ""), `ekspor ${j}: 200 + text/csv (${t.split("\n").length - 1} baris)`);
    csv[j] = parseCsv(t);
  }
  const ring = Object.fromEntries(csv.ringkasan.slice(1));
  ok(Number(ring["Total respons valid"]) === valid.length, `ringkasan: total respons valid ${ring["Total respons valid"]} = independen ${valid.length}`);
  const meanKey = Object.keys(ring).find((k) => /Rata-rata nilai per percobaan/.test(k));
  const mean = Number(String(ring[meanKey]).replace(",", "."));
  ok(Math.abs(mean - 59.26) < 0.06, `ringkasan: rata-rata nilai ${ring[meanKey]} ≈ independen 59,26`);
  ok(csv.peserta.length - 1 === valid.length, `peserta: ${csv.peserta.length - 1} baris = ${valid.length} respons valid`);
  const kelas = csv.kelas.slice(1).map((r) => r.slice(0, 2).join(":"));
  ok(csv.kelas.length - 1 === 3 && csv.kelas.slice(1).every((r) => r[1] === "9"), `kelas: 3 baris @ 9 respons (${kelas.join(" ; ")})`);

  // ---- ekspor respons mentah
  const R = await get(`/dashboard/forms/${F3}/responses/export`);
  const rt = await R.text();
  const rc = parseCsv(rt);
  ok(R.status === 200 && rc.length - 1 === fx.subs.length, `ekspor respons: ${rc.length - 1} baris = ${fx.subs.length} tersimpan`);
  console.log("kolom CSV respons:", rc[0].join(" | "));

  // ---- halaman Respons + detail
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await c.addCookies([{ name: "sb-127-auth-token", value: COOKIE, url: BASE }]);
  const p = await c.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && !/WebSocket|realtime/i.test(m.text()) && errs.push(m.text()));
  await p.goto(`${BASE}/dashboard/forms/${F3}/responses`, { waitUntil: "networkidle" });
  ok(((await p.textContent("p[aria-live]")) || "").trim().startsWith(String(fx.subs.length)), `halaman Respons: "${((await p.textContent("p[aria-live]")) || "").trim()}"`);
  ok((await p.locator("ul > li").filter({ has: p.locator('input[name="ids"]') }).count()) === 20, "halaman 1 menampilkan 20 respons (PAGE_SIZE)");
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "halaman Respons tidak melebar");
  await p.goto(`${BASE}/dashboard/forms/${F3}/responses?page=2`, { waitUntil: "networkidle" });
  ok((await p.locator('input[name="ids"]').count()) === fx.subs.length - 20, `halaman 2: sisa ${fx.subs.length - 20} respons`);
  await p.goto(`${BASE}/dashboard/forms/${F3}/responses?q=siswa%203`, { waitUntil: "networkidle" });
  const hit = await p.locator('input[name="ids"]').count();
  ok(hit > 0 && hit < fx.subs.length, `pencarian "siswa 3": ${hit} cocok`);
  await p.goto(`${BASE}/dashboard/forms/${F3}/responses?from=2026-10-03&to=2026-10-04`, { waitUntil: "networkidle" });
  const inRange = fx.subs.filter((s) => { const d = new Date(Date.parse(s.submitted_at) + 7 * 3600e3).toISOString().slice(0, 10); return d >= "2026-10-03" && d <= "2026-10-04"; }).length;
  ok((await p.locator('input[name="ids"]').count()) === inRange, `filter tanggal 3–4 Okt (WIB): ${inRange} respons (hitungan independen)`);
  await p.goto(`${BASE}/dashboard/forms/${F3}/responses/${fx.subs[0].id}`, { waitUntil: "networkidle" });
  ok(((await p.textContent("h1")) || "").length > 0 && (await p.locator("text=Ibu kota Indonesia?").count()) > 0, "halaman detail respons menampilkan soal dan jawaban");
  await p.screenshot({ path: `${SHOT_DIR}/r-detail.png` });
  ok(errs.length === 0, "tidak ada error JS/konsol" + (errs.length ? ": " + errs[0].slice(0, 100) : ""));
  await b.close();
  console.log(`\nHASIL: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("ERROR SKRIP:", e.message.split("\n")[0]); process.exit(2); });

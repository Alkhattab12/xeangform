// Uji visual di Chromium (Playwright) terhadap server produksi + Supabase tiruan. Lihat scripts/visual/README.md
const SHOT_DIR = process.env.SHOT_DIR || require("os").tmpdir();
const { chromium } = require("playwright");
const BASE = "http://localhost:3112";
const F1 = "11111111-1111-4111-8111-111111111111";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", aud: "authenticated", role: "authenticated", email: "rexxi@example.com", email_confirmed_at: "2026-10-01T00:00:00Z", app_metadata: {}, user_metadata: { display_name: "etherealrexx" }, created_at: "2026-10-01T00:00:00Z" };
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: USER.id, aud: "authenticated", role: "authenticated", exp })}.sig`;
const COOKIE = "base64-" + b64u({ access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user: USER });
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const tx = (m) => { if (!m || m === "none") return [0, 0]; const v = m.match(/matrix(3d)?\((.*)\)/)[2].split(",").map(Number); return v.length === 6 ? [v[4], v[5]] : [v[12], v[13]]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, ...opts });
  await c.addCookies([{ name: "sb-127-auth-token", value: COOKIE, url: BASE }]);
  return c;
}
const style = (p, sel, pseudo, prop) => p.evaluate(([s, ps, pr]) => { const e = document.querySelector(s); return e ? getComputedStyle(e, ps || null)[pr] : null; }, [sel, pseudo, prop]);
const pos = async (p, sel, pseudo) => tx(await style(p, sel, pseudo, "transform"));
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const cls = async (p, sel) => (await p.getAttribute(sel, "class")) || "";

(async () => {
  const browser = await chromium.launch();
  // ---------- T1 dashboard (mobile) ----------
  let c = await ctx(browser); let p = await c.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  ok((await p.textContent("h1")).includes("etherealrexx"), "dashboard terbuka dengan sesi tiruan");
  ok((await p.locator("header >> text=Keluar").count()) === 0, "tombol Keluar TIDAK ada lagi di header dashboard");
  ok((await overflow(p)) <= 0, "halaman tidak melebar keluar layar (360px)");
  const hb = await p.evaluate(() => Math.max(...[...document.querySelector("header").querySelectorAll("a,button")].map((e) => Math.round(e.getBoundingClientRect().right))));
  ok(hb <= 360, `semua kontrol header muat di layar (kanan terjauh ${hb}px)`);
  await p.screenshot({ path: `${SHOT_DIR}/v-dash.png` });

  // ---------- T2 tombol bintang: ukur gerak nyata ----------
  const star = p.locator("header button[aria-pressed]");
  ok((await star.getAttribute("aria-pressed")) === "true", "default: animasi latar GERAK (aria-pressed=true)");
  let a0 = await pos(p, ".xf-bg-blob-a"), g0 = await pos(p, ".xf-bg-grid"); await p.waitForTimeout(1500);
  let a1 = await pos(p, ".xf-bg-blob-a"), g1 = await pos(p, ".xf-bg-grid");
  ok(dist(a0, a1) > 8, `mode gerak: blob benar-benar bergeser (${dist(a0, a1).toFixed(1)}px dalam 1,5 dtk)`);
  ok(dist(g0, g1) > 3, `mode gerak: pola titik ikut bergeser (${dist(g0, g1).toFixed(1)}px)`);
  await star.click(); await p.waitForTimeout(300);
  ok((await p.getAttribute("html", "data-bg-motion")) === "diam", "klik bintang -> data-bg-motion=diam");
  ok((await star.getAttribute("aria-pressed")) === "false", "tombol menampilkan status MATI");
  ok(((await p.textContent(".xf-toast")) || "").includes("DIAM"), "toast umpan balik 'Animasi latar: DIAM' muncul");
  ok((await style(p, ".xf-bg-blob-a", null, "animationName")) === "none" && (await style(p, ".xf-bg-grid", null, "animationName")) === "none", "mode diam: animasi blob dan pola titik BERHENTI total");
  a0 = await pos(p, ".xf-bg-blob-a"); await p.waitForTimeout(1200); a1 = await pos(p, ".xf-bg-blob-a");
  ok(dist(a0, a1) === 0, "mode diam: posisi blob tidak berubah sama sekali");
  await p.screenshot({ path: `${SHOT_DIR}/v-dash-diam.png` });
  await p.reload({ waitUntil: "networkidle" });
  ok((await p.getAttribute("html", "data-bg-motion")) === "diam", "pilihan DIAM tersimpan setelah refresh");
  await p.locator("header button[aria-pressed]").click(); await p.waitForTimeout(300);
  ok(((await p.textContent(".xf-toast")) || "").includes("GERAK"), "toast 'GERAK' saat dinyalakan lagi");
  a0 = await pos(p, ".xf-bg-blob-a"); await p.waitForTimeout(1500); a1 = await pos(p, ".xf-bg-blob-a");
  ok(dist(a0, a1) > 8, "dinyalakan lagi: blob bergerak kembali");

  // ---------- T3 halaman Akun ----------
  await p.goto(BASE + "/dashboard/akun", { waitUntil: "networkidle" });
  ok((await p.locator("button", { hasText: "Keluar dari akun" }).count()) === 1, "halaman Akun punya tombol 'Keluar dari akun'");
  ok((await overflow(p)) <= 0, "halaman Akun tidak melebar");
  await p.locator("button", { hasText: "Keluar dari akun" }).scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SHOT_DIR}/v-akun.png` });
  await c.close();

  // ---------- T4 editor (desktop) ----------
  c = await ctx(browser, { viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false }); p = await c.newPage();
  await p.goto(`${BASE}/dashboard/forms/${F1}`, { waitUntil: "networkidle" });
  const canvas = '[aria-label="Kanvas form"]';
  ok((await cls(p, canvas)).includes("xf-dyn"), "editor: kanvas memakai mode dinamis (tema Galaxy + motion)");
  ok((await p.locator(`${canvas} .xf-dyn-shape`).count()) === 6, "editor: 6 elemen hias melayang tampil");
  ok((await style(p, canvas, "::before", "animationName")) === "xf-pan", "editor: latar bintang bergerak (xf-pan)");
  let e0 = await pos(p, canvas, "::before"); await p.waitForTimeout(1500); let e1 = await pos(p, canvas, "::before");
  ok(dist(e0, e1) > 5, `editor: latar tema benar-benar bergeser (${dist(e0, e1).toFixed(1)}px)`);
  let s0 = await pos(p, ".xf-dyn-shape-1"); await p.waitForTimeout(1200); let s1 = await pos(p, ".xf-dyn-shape-1");
  ok(dist(s0, s1) > 3 || (await style(p, ".xf-dyn-shape-1", null, "animationName")) !== "none", `editor: bentuk hias melayang (${dist(s0, s1).toFixed(1)}px)`);
  await p.getByRole("group", { name: "Pengaturan form" }).getByRole("button", { name: "Tema", exact: true }).click();
  const sw = p.getByRole("switch", { name: /Mode dinamis/ });
  ok((await sw.getAttribute("aria-checked")) === "true", "panel tema: sakelar Mode dinamis AKTIF");
  await p.screenshot({ path: `${SHOT_DIR}/v-editor.png` });
  await sw.click(); await p.waitForTimeout(200);
  ok(!(await cls(p, canvas)).includes("xf-dyn"), "sakelar dimatikan -> kanvas kembali statis");
  ok((await p.locator(`${canvas} .xf-dyn-shape`).count()) === 0, "elemen hias hilang saat mode dinamis mati");
  await sw.click(); await p.waitForTimeout(200);
  ok((await cls(p, canvas)).includes("xf-dyn"), "sakelar dinyalakan lagi -> bergerak lagi");
  await p.getByRole("button", { name: /Keren/ }).first().click(); await p.waitForTimeout(200);
  ok((await cls(p, canvas)).includes("xf-dyn"), "ganti ke tema Keren: mode dinamis ikut terbawa");
  ok((await p.getAttribute(canvas, "data-decor")) === "grid", "dekorasi mengikuti tema (Keren = kisi)");
  ok((await style(p, canvas, "::before", "animationName")) === "xf-pan", "tema Keren: kisi bergeser (xf-pan)");
  await p.locator("header button[aria-pressed]").click(); await p.waitForTimeout(300);
  ok((await style(p, canvas, "::before", "animationName")) === "none" && (await style(p, canvas, "::after", "animationName")) === "none" && (await style(p, ".xf-dyn-shape-1", null, "animationName")) === "none", "tombol ✦ DIAM menghentikan semua animasi dinamis di editor (latar, aurora, bentuk)");
  ok((await p.getByRole("status").filter({ hasText: "sedang DIAM" }).count()) >= 1, "panel tema memberi tahu bahwa pratinjau diam karena tombol ✦");
  await c.close();

  // ---------- T5 form publik (mobile) ----------
  c = await ctx(browser); p = await c.newPage();
  await p.goto(`${BASE}/f/demo-dinamis`, { waitUntil: "networkidle" });
  ok((await cls(p, ".xf-dyn")).includes("xf-dyn-live"), "form publik: wrapper dinamis aktif");
  ok((await p.getAttribute(".xf-dyn", "data-decor")) === "stars", "dekorasi Galaxy = bintang");
  ok((await style(p, ".xf-dyn", "::before", "animationName")) === "xf-pan", "form publik: bintang latar bergeser");
  ok((await style(p, ".xf-dyn", "::after", "animationName")) === "xf-aurora", "form publik: cahaya aurora bertema bergerak");
  const au0 = await pos(p, ".xf-dyn", "::after"); await p.waitForTimeout(1500); const au1 = await pos(p, ".xf-dyn", "::after");
  ok(dist(au0, au1) > 3, `aurora benar-benar bergeser (${dist(au0, au1).toFixed(1)}px)`);
  const vis = await p.evaluate(() => [...document.querySelectorAll(".xf-dyn-shape")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth; }).length);
  ok(vis >= 4, `bentuk hias berada di dalam layar (${vis}/6 terlihat sebagian)`);
  ok((await style(p, ".xf-dyn-shape-2", null, "animationName")) === "xf-twinkle", "form publik: bentuk hias Galaxy berkedip (twinkle)");
  ok((await style(p, ".xf-dyn-live .nb-btn:not(.nb-btn-ghost)", null, "animationName")) === "xf-pulse", "tombol utama berdenyut pelan");
  ok((await overflow(p)) <= 0, "form publik tidak melebar keluar layar");
  await p.screenshot({ path: `${SHOT_DIR}/v-public-1.png` }); await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOT_DIR}/v-public-2.png` });
  await c.close();
  c = await ctx(browser, { reducedMotion: "reduce" }); p = await c.newPage();
  await p.goto(`${BASE}/f/demo-dinamis`, { waitUntil: "networkidle" });
  ok((await style(p, ".xf-dyn", "::before", "animationName")) === "none" && (await style(p, ".xf-dyn", "::after", "animationName")) === "none" && (await style(p, ".xf-dyn-shape-1", null, "animationName")) === "none", "kurangi gerakan (sistem): semua animasi dinamis mati");
  await c.close();
  c = await ctx(browser); p = await c.newPage();
  await p.goto(`${BASE}/f/demo-statis`, { waitUntil: "networkidle" });
  ok((await p.locator(".xf-dyn").count()) === 0, "tema tanpa motion: TIDAK ada lapisan dinamis (perilaku lama utuh)");
  await c.close();

  // ---------- T7 halaman 404 bermerek ----------
  c = await ctx(browser); p = await c.newPage();
  const r404 = await p.goto(BASE + "/halaman-acak", { waitUntil: "networkidle" });
  ok(r404.status() === 404, "rute tidak ada -> HTTP 404");
  ok(((await p.textContent("h1")) || "").includes("Halaman tidak ketemu"), "404 memakai halaman kustom bermerek");
  ok((await p.getByRole("link", { name: "Kembali ke beranda", exact: true }).count()) === 1, "404: ada tautan kembali ke beranda");
  ok((await overflow(p)) <= 0, "404 tidak melebar di 360px");
  ok((await p.locator(".xf-bg").count()) === 1, "404 ikut memakai latar global");
  await p.screenshot({ path: `${SHOT_DIR}/v-404.png` });
  const rf = await p.goto(BASE + "/f/tidak-ada-slug", { waitUntil: "networkidle" });
  ok(rf.status() === 404 && (await p.title()).includes("Form tidak tersedia"), "form publik yang tidak ada -> 404 'Form tidak tersedia' (backend hidup)");
  // database "mati" (mock membalas 500): harus tampil halaman error bermerek, BUKAN 404 palsu
  await p.goto(BASE + "/f/kaboom-form", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  ok((await p.getByRole("heading", { name: "Layanan sedang bermasalah." }).count()) === 1 && (await p.title()).includes("Ada kendala"), "database mati: halaman error bermerek tampil + judul tab (bukan 404)");
  ok((await p.getByRole("button", { name: "Coba lagi" }).count()) === 1 && (await overflow(p)) <= 0, "error: tombol Coba lagi ada dan layout tidak melebar");
  await p.screenshot({ path: `${SHOT_DIR}/v-error.png` });
  await p.getByRole("button", { name: "Coba lagi" }).click(); await p.waitForTimeout(800);
  ok((await p.getByRole("heading", { name: "Layanan sedang bermasalah." }).count()) === 1, "klik Coba lagi tidak membuat halaman crash (tetap error karena database masih mati)");
  await p.goto(BASE + "/halaman-acak", { waitUntil: "networkidle" });
  const og = await p.evaluate(() => ({ img: document.querySelector('meta[property="og:image"]')?.content, title: document.querySelector('meta[property="og:title"]')?.content }));
  ok(/^https:\/\/[^/]+\/og\.png$/.test(og.img || ""), `og:image berupa URL absolut: ${og.img}`);
  await c.close();

  // ---------- T6 logout dari halaman Akun ----------
  c = await ctx(browser); p = await c.newPage();
  await p.goto(BASE + "/dashboard/akun", { waitUntil: "networkidle" });
  await Promise.all([p.waitForURL((u) => u.pathname === "/", { timeout: 15000 }), p.locator("button", { hasText: "Keluar dari akun" }).click()]);
  ok(new URL(p.url()).pathname === "/", "klik 'Keluar dari akun' -> diarahkan ke beranda");
  await c.close();
  ok(errors.length === 0, "tidak ada error JavaScript" + (errors.length ? ": " + errors[0] : ""));
  await browser.close();
  console.log(`\nHASIL: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("ERROR SKRIP:", e.message.split("\n")[0]); process.exit(2); });

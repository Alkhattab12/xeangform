// Uji Analitik di Chromium: posisi label donat (harus di dalam cincin), angka tengah, dan hitungan independen. Lihat scripts/visual/README.md
const { chromium } = require("playwright");
const BASE = "http://localhost:3112", MOCK = "http://127.0.0.1:54321";
const F3 = "33333333-3333-4333-8333-333333333333";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", aud: "authenticated", role: "authenticated", email: "rexxi@example.com", email_confirmed_at: "2026-10-01T00:00:00Z", app_metadata: {}, user_metadata: { display_name: "etherealrexx" }, created_at: "2026-10-01T00:00:00Z" };
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: USER.id, aud: "authenticated", role: "authenticated", exp })}.sig`;
const COOKIE = "base64-" + b64u({ access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user: USER });
const SHOT = process.env.SHOT_DIR || require("os").tmpdir();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Hitung ulang dari data mentah, tanpa memakai kode aplikasi
function expected(fx) {
  const valid = fx.subs.filter((s) => s.status !== "spam");
  const byClass = {}; const names = { k1: "X-A", k2: "X-B", k3: "X-C" };
  let sum = 0;
  for (const s of valid) {
    const a = s.answers_json;
    byClass[names[a.k.optionId]] = (byClass[names[a.k.optionId]] || 0) + 1;
    let c = 0;
    if (a.s1.optionId === "a1") c++;
    const g = [...a.s2.optionIds].sort().join(","); if (g === "p1,p2,p4") c++;
    if (["5", "lima"].includes(norm(String(a.s3)))) c++;
    if (a.s4 === 42) c++;
    sum += (c / 4) * 100;
  }
  return { n: valid.length, byClass, mean: sum / valid.length };
}

// Ukur posisi label terhadap pusat donat di dalam satu .recharts-wrapper
const measure = (root) => {
  const sectors = [...root.querySelectorAll(".recharts-pie-sector path")];
  if (!sectors.length) return null;
  const bb = sectors.map((p) => p.getBoundingClientRect());
  const L = Math.min(...bb.map((b) => b.left)), R = Math.max(...bb.map((b) => b.right)), T = Math.min(...bb.map((b) => b.top)), B = Math.max(...bb.map((b) => b.bottom));
  const cx = (L + R) / 2, cy = (T + B) / 2, Ro = Math.min(R - L, B - T) / 2;
  const labels = [...root.querySelectorAll("svg text")].filter((t) => /%$/.test(t.textContent.trim()));
  const ratios = labels.map((t) => { const r = t.getBoundingClientRect(); return Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) / Ro; });
  const outside = labels.filter((t) => { const r = t.getBoundingClientRect(); return Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) > Ro; }).length;
  const wrap = root.closest("[role=img]");
  const center = wrap ? [...wrap.querySelectorAll("div")].map((d) => d.innerText).find((t) => t && !t.includes("%") && /\d/.test(t)) : null;
  return { n: labels.length, min: ratios.length ? Math.min(...ratios) : null, max: ratios.length ? Math.max(...ratios) : null, outside, center: center ? center.replace(/\s+/g, " ").trim() : null };
};

(async () => {
  const fx = await (await fetch(MOCK + "/__fixture")).json();
  const exp0 = expected(fx);
  console.log("Hitung ulang independen:", JSON.stringify({ n: exp0.n, byClass: exp0.byClass, mean: +exp0.mean.toFixed(2) }));
  const browser = await chromium.launch();
  for (const [name, vp] of [["mobile", { width: 360, height: 740 }], ["desktop", { width: 1280, height: 900 }]]) {
    const c = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: name === "mobile", hasTouch: name === "mobile" });
    await c.addCookies([{ name: "sb-127-auth-token", value: COOKIE, url: BASE }]);
    const p = await c.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && !/WebSocket|realtime/i.test(m.text()) && errs.push(m.text()));
    await p.goto(`${BASE}/dashboard/forms/${F3}/analytics`, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    console.log(`\n=== ${name} ${vp.width}px ===`);
    ok(((await p.textContent("h1")) || "").includes("Kuis Matematika"), "halaman analitik terbuka");
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "tidak ada scroll horizontal");

    // --- akumulasi respons kuis: donat per dimensi
    const sec = p.locator("#sec-akumulasi").locator("xpath=..");
    const para = (await sec.locator("p").first().textContent()) || "";
    const shown = Number((para.match(/([\d.]+)\s+respons dalam filter/) || [])[1]?.replace(/\./g, ""));
    ok(shown === exp0.n, `jumlah respons valid di halaman (${shown}) = hitungan independen (${exp0.n})`);
    const tabs = sec.getByRole("tab");
    const tabNames = await tabs.allTextContents();
    console.log("dimensi:", tabNames.join(" | "));
    for (let i = 0; i < tabNames.length; i++) {
      await tabs.nth(i).click(); await p.waitForTimeout(1600);
      const m = await sec.locator(".recharts-wrapper").first().evaluate(measure);
      ok(m && m.n > 0 && m.outside === 0 && m.min >= 0.6 && m.max <= 0.97, `[${tabNames[i]}] donat: ${m?.n} label semuanya DI DALAM cincin (jarak ${m?.min?.toFixed(2)}–${m?.max?.toFixed(2)} dari jari-jari)`);
      ok(m && m.center && /\d/.test(m.center), `[${tabNames[i]}] angka total di tengah donat: "${m?.center}"`);
      if (i === 0) {
        const legend = (await sec.locator("ul li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
        console.log("legenda kelas:", legend.join(" ; "));
        for (const [k, v] of Object.entries(exp0.byClass)) ok(legend.some((t) => t.startsWith(`${k}: ${v} `)), `kelas ${k}: aplikasi menampilkan ${v} (hitungan independen)`);
        const total = legend.reduce((a, t) => a + Number((t.match(/: (\d+) /) || [])[1] || 0), 0);
        ok(total === exp0.n, `jumlah semua kelas (${total}) = total respons (${exp0.n})`);
        ok(m.center.startsWith(String(exp0.n)), `angka tengah donat (${m.center}) = total respons ${exp0.n}`);
        await sec.screenshot({ path: `${SHOT}/a-${name}-donat.png` });
        // lingkaran penuh: label juga di dalam
        await sec.getByRole("button", { name: "Lingkaran" }).click(); await p.waitForTimeout(1600);
        const mp = await sec.locator(".recharts-wrapper").first().evaluate(measure);
        ok(mp && mp.n > 0 && mp.outside === 0 && mp.max <= 0.8, `mode Lingkaran: ${mp?.n} label di dalam irisan (maks ${mp?.max?.toFixed(2)})`);
        await sec.getByRole("button", { name: "Donat" }).click(); await p.waitForTimeout(1200);
      }
    }
    // --- akumulasi per soal (donat kecil)
    const qsec = p.locator("#sec-akumulasi-soal").locator("xpath=..");
    const cards = qsec.locator("article");
    const nCards = await cards.count();
    ok(nCards > 0, `akumulasi per soal: ${nCards} kartu`);
    let bad = 0, withLabels = 0;
    for (let i = 0; i < nCards; i++) {
      const w = cards.nth(i).locator(".recharts-wrapper").first();
      if (!(await w.count())) continue;
      const m = await w.evaluate(measure);
      if (m && m.n > 0) { withLabels++; if (m.outside > 0 || m.max > 0.97 || m.min < 0.6) bad++; }
    }
    ok(withLabels > 0 && bad === 0, `per soal: ${withLabels} donat berlabel, ${bad} yang labelnya keluar cincin`);
    const centers = await cards.evaluateAll((els) => els.map((e) => { const w = e.querySelector("[role=img]"); const d = w && [...w.querySelectorAll("div")].map((x) => x.innerText).find((t) => t && !t.includes("%") && /Peserta/.test(t)); return d ? d.replace(/\s+/g, " ").trim() : null; }));
    ok(centers.filter(Boolean).every((t) => t.startsWith(String(exp0.n))), `soal pilihan ganda: tengah donat = jumlah peserta ${exp0.n} (bukan jumlah pilihan): ${[...new Set(centers.filter(Boolean))].join(" / ")}`);
    await cards.first().screenshot({ path: `${SHOT}/a-${name}-soal.png` });
    await cards.nth(1).screenshot({ path: `${SHOT}/a-${name}-soal2.png` }).catch(() => {});

    // --- rata-rata nilai di kartu ringkasan vs hitungan independen
    const card = await p.evaluate(() => { const l = [...document.querySelectorAll("p.nb-mono")].find((e) => e.textContent.trim() === "Rata-rata nilai"); return l ? l.nextElementSibling.textContent.trim() : null; });
    const got = card ? Number(card.replace(",", ".")) : NaN;
    ok(Number.isFinite(got) && Math.abs(got - exp0.mean) < 0.06, `rata-rata nilai aplikasi ${card} ≈ hitungan independen ${exp0.mean.toFixed(1)}`);
    await p.screenshot({ path: `${SHOT}/a-${name}-top.png` });
    ok(errs.length === 0, "tidak ada error konsol/JS" + (errs.length ? ": " + errs[0].slice(0, 120) : ""));
    await c.close();
  }
  await browser.close();
  console.log(`\nHASIL: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("ERROR SKRIP:", e.message.split("\n")[0]); process.exit(2); });

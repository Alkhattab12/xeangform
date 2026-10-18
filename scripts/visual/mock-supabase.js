// Supabase tiruan minimal untuk uji visual lokal (auth + PostgREST). Bukan layanan sungguhan.
const http = require("http");
const USER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", aud: "authenticated", role: "authenticated", email: "rexxi@example.com", email_confirmed_at: "2026-10-01T00:00:00Z", app_metadata: {}, user_metadata: { display_name: "etherealrexx" }, created_at: "2026-10-01T00:00:00Z" };
const F1 = "11111111-1111-4111-8111-111111111111", F2 = "22222222-2222-4222-8222-222222222222";
const fields = [
  { id: "q1", type: "short_text", label: "Nama lengkap", required: true },
  { id: "q2", type: "radio", label: "Pilih satu", required: false, options: [{ id: "o1", label: "Opsi A" }, { id: "o2", label: "Opsi B" }] },
  { id: "q3", type: "long_text", label: "Ceritakan pengalamanmu", required: false },
];
const mk = (id, slug, title, theme, status = "published") => ({ id, owner_id: USER.id, slug, title, description: "Form uji visual", status, schema_json: { fields }, settings_json: {}, theme_json: theme, created_at: "2026-10-10T00:00:00Z", updated_at: "2026-10-14T00:00:00Z", form_submissions: [{ count: id === F1 ? 1 : 0 }] });
const forms = [mk(F1, "demo-dinamis", "Form Galaxy Dinamis", { preset: "galaxy", motion: "dinamis" }), mk(F2, "demo-statis", "Form Neo Statis", { preset: "neo" }, "published")];
const F3 = "33333333-3333-4333-8333-333333333333";
const opt = (id, label) => ({ id, label });
const quizFields = [
  { id: "k", type: "dropdown", label: "Kelas", required: true, options: [opt("k1", "X-A"), opt("k2", "X-B"), opt("k3", "X-C")] },
  { id: "nm", type: "short_text", label: "Nama lengkap", required: true },
  { id: "s1", type: "radio", label: "Ibu kota Indonesia?", required: true, options: [opt("a1", "Jakarta"), opt("a2", "Bandung"), opt("a3", "Surabaya"), opt("a4", "Medan")], answerKey: { optionIds: ["a1"] } },
  { id: "s2", type: "checkbox", label: "Pilih semua bilangan prima", required: true, options: [opt("p1", "2"), opt("p2", "3"), opt("p3", "4"), opt("p4", "5")], answerKey: { optionIds: ["p1", "p2", "p4"] } },
  { id: "s3", type: "short_text", label: "Berapa 2 + 3?", required: true, answerKey: { text: ["5", "lima"] } },
  { id: "s4", type: "number", label: "Berapa 6 x 7?", required: true, answerKey: { number: 42 } },
  { id: "s5", type: "rating", label: "Seberapa suka kuis ini?", required: false, ratingMax: 5 },
];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const subs = Array.from({ length: 28 }, (_, i) => {
  const cls = ["k1", "k2", "k3"][i % 3];
  const good = rnd() < 0.6;
  const day = 1 + (i % 8), hh = 1 + (i % 12);
  const who = i < 14 ? { name: `Siswa ${1 + (i % 10)}`, email: `siswa${1 + (i % 10)}@sekolah.id` } : undefined;
  return {
    id: `0000${String(i).padStart(4, "0")}-0000-4000-8000-000000000000`, form_id: F3,
    submitted_at: `2026-10-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:15:00+00:00`,
    status: i === 5 ? "flagged" : i === 9 ? "spam" : "received",
    respondent_id: i < 14 ? `00000000-0000-4000-8000-0000000000${String(1 + (i % 10)).padStart(2, "0")}` : null,
    answers_json: { k: { optionId: cls }, nm: `Siswa ${i}`, s1: { optionId: good ? "a1" : pick(["a2", "a3", "a4"]) }, s2: { optionIds: good ? ["p1", "p2", "p4"] : pick([["p1", "p2"], ["p1", "p3"], ["p2", "p3", "p4"]]) }, s3: good ? pick(["5", "Lima"]) : pick(["6", "empat"]), s4: good ? 42 : pick([36, 48]), ...(rnd() < 0.8 ? { s5: 1 + Math.floor(rnd() * 5) } : {}) },
    metadata_json: who ? { respondent: who } : {},
  };
});
const quizForm = { ...mk(F3, "kuis-matematika", "Kuis Matematika X", { preset: "neo" }), schema_json: { fields: quizFields }, settings_json: { quiz: true }, form_submissions: [{ count: subs.length }] };
const tables = { forms: [...forms, quizForm], profiles: [{ id: USER.id, display_name: "etherealrexx" }], form_submissions: subs, submission_files: [], notifications: [], user_audio_tracks: [] };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const send = (code, body, extra = {}) => { res.writeHead(code, { "content-type": "application/json; charset=utf-8", ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
  if (u.pathname === "/__fixture") return send(200, { subs, quizFields });
  if (u.pathname === "/auth/v1/user") return send(200, USER);
  if (u.pathname.startsWith("/auth/v1/")) return send(200, {});
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)/);
  if (!m) return send(404, { message: "no" });
  if (req.method !== "GET" && req.method !== "HEAD") { req.resume(); return send(req.method === "POST" ? 201 : 204); }
  if (u.searchParams.get("slug") === "eq.kaboom-form") { req.resume(); return send(500, { message: "db down (simulasi)" }); }
  let rows = [...(tables[m[1]] ?? [])];
  for (const [k, v] of u.searchParams) {
    const eq = String(v).match(/^eq\.(.*)$/);
    if (eq && rows[0] && k in rows[0]) rows = rows.filter((r) => String(r[k]) === eq[1]);
    const rg = String(v).match(/^(gte|lte)\.(.*)$/);
    if (rg && rows[0] && k in rows[0]) rows = rows.filter((r) => (rg[1] === "gte" ? Date.parse(r[k]) >= Date.parse(rg[2]) : Date.parse(r[k]) <= Date.parse(rg[2])));
    const neq = String(v).match(/^neq\.(.*)$/);
    if (neq && rows[0] && k in rows[0]) rows = rows.filter((r) => String(r[k]) !== neq[1]);
  }
  const ord = u.searchParams.get("order");
  if (ord) { const [col, dir] = ord.split("."); rows.sort((a, b) => (Date.parse(a[col]) - Date.parse(b[col])) * (dir === "desc" ? -1 : 1)); }
  const total = rows.length;
  const lim = Number(u.searchParams.get("limit")); if (lim > 0) rows = rows.slice(Number(u.searchParams.get("offset") || 0), Number(u.searchParams.get("offset") || 0) + lim);
  const prefer = String(req.headers.prefer ?? "");
  const headers = prefer.includes("count") ? { "content-range": total ? `0-${Math.max(0, rows.length - 1)}/${total}` : "*/0" } : {};
  if (String(req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows.length ? send(200, rows[0], headers) : send(406, { code: "PGRST116", message: "0 rows" });
  return send(200, rows, headers);
}).listen(54321, "127.0.0.1", () => console.log("mock supabase :54321"));

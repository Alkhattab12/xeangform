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
const tables = { forms, profiles: [{ id: USER.id, display_name: "etherealrexx" }], form_submissions: [{ id: "s1" }], submission_files: [], notifications: [], user_audio_tracks: [] };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const send = (code, body, extra = {}) => { res.writeHead(code, { "content-type": "application/json; charset=utf-8", ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
  if (u.pathname === "/auth/v1/user") return send(200, USER);
  if (u.pathname.startsWith("/auth/v1/")) return send(200, {});
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)/);
  if (!m) return send(404, { message: "no" });
  if (req.method !== "GET" && req.method !== "HEAD") { req.resume(); return send(req.method === "POST" ? 201 : 204); }
  let rows = [...(tables[m[1]] ?? [])];
  for (const [k, v] of u.searchParams) {
    const eq = String(v).match(/^eq\.(.*)$/);
    if (eq && rows[0] && k in rows[0]) rows = rows.filter((r) => String(r[k]) === eq[1]);
    const neq = String(v).match(/^neq\.(.*)$/);
    if (neq && rows[0] && k in rows[0]) rows = rows.filter((r) => String(r[k]) !== neq[1]);
  }
  const prefer = String(req.headers.prefer ?? "");
  const headers = prefer.includes("count") ? { "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0" } : {};
  if (String(req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows.length ? send(200, rows[0], headers) : send(406, { code: "PGRST116", message: "0 rows" });
  return send(200, rows, headers);
}).listen(54321, "127.0.0.1", () => console.log("mock supabase :54321"));

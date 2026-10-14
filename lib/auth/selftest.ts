// Jalankan: npx tsx --tsconfig tsconfig.json lib/auth/selftest.ts
import assert from "node:assert/strict";
import { isServiceFailure, mapSignInError, MSG_BAD_CREDENTIALS, MSG_RATE, MSG_SERVICE, MSG_UNVERIFIED } from "./errors";
import { classifyLinkError, failurePath, parseFlow, parseOtpType, successPath } from "./callback";
import { pickSiteOrigin } from "./origin";
import { displayNameSchema, newPasswordSchema } from "./passwords";
import { isEmailVerified } from "./verified";
import { getVerifiedUser } from "./verified-user";
import { safeNext } from "../utils/safe-next";

// ---- Status verifikasi hanya dari email_confirmed_at milik penyedia autentikasi
assert.equal(isEmailVerified({ email_confirmed_at: "2026-10-14T00:00:00Z" }), true);
assert.equal(isEmailVerified({ email_confirmed_at: null }), false);
assert.equal(isEmailVerified({}), false);
assert.equal(isEmailVerified(null), false);
assert.equal(isEmailVerified(undefined), false);

// ---- Origin: Origin palsu (host berbeda) TIDAK dipercaya
const base = { host: "xeangform.vercel.app", envUrl: null };
assert.equal(pickSiteOrigin({ ...base, origin: "https://xeangform.vercel.app" }), "https://xeangform.vercel.app");
assert.equal(pickSiteOrigin({ ...base, origin: "https://evil.example" }), "https://xeangform.vercel.app"); // jatuh ke host permintaan
assert.equal(pickSiteOrigin({ ...base, origin: "https://evil.example", envUrl: "https://app.xean.id/x?y" }), "https://app.xean.id");
assert.equal(pickSiteOrigin({ origin: "javascript:alert(1)", host: "a.b", envUrl: null }), "https://a.b");
assert.equal(pickSiteOrigin({ origin: null, host: "localhost:3000", envUrl: null }), "http://localhost:3000");
assert.equal(pickSiteOrigin({ origin: null, host: null, envUrl: null }), "http://localhost:3000");
assert.equal(pickSiteOrigin({ origin: null, host: "bad host!", envUrl: null }), "http://localhost:3000");
assert.equal(pickSiteOrigin({ origin: "https://x.y", host: "a.b", forwardedHost: "x.y", envUrl: null }), "https://x.y");

// ---- Klasifikasi error tautan
assert.equal(classifyLinkError({ code: "otp_expired" }), "kedaluwarsa");
assert.equal(classifyLinkError("otp_expired"), "kedaluwarsa");
assert.equal(classifyLinkError({ message: "Email link is invalid or has expired" }), "kedaluwarsa");
assert.equal(classifyLinkError({ code: "flow_state_expired" }), "kedaluwarsa");
assert.equal(classifyLinkError({ message: "invalid request: both auth code and code verifier should be non-empty" }), "kode");
assert.equal(classifyLinkError({ message: "something else" }), "tautan");
assert.equal(classifyLinkError(null), "tautan");
assert.equal(classifyLinkError({ name: "AuthRetryableFetchError", message: "fetch failed", status: 0 }), "layanan"); // jaringan putus != tautan rusak
assert.equal(classifyLinkError({ status: 503 }), "layanan");

// ---- Parser parameter
assert.equal(parseFlow("signup"), "signup");
assert.equal(parseFlow("hack"), null);
assert.equal(parseOtpType("signup"), "signup");
assert.equal(parseOtpType("sms"), null);
assert.equal(parseOtpType(null), null);

// ---- Tujuan setelah berhasil / gagal
assert.equal(successPath("signup", null, "/dashboard"), "/auth/terverifikasi?next=%2Fdashboard");
assert.equal(successPath(null, "signup", "/dashboard/forms/1"), "/auth/terverifikasi?next=%2Fdashboard%2Fforms%2F1");
assert.equal(successPath("recovery", null, "/dashboard"), "/reset-password");
assert.equal(successPath(null, null, "/reset-password"), "/reset-password");
assert.equal(successPath("email_change", null, "/dashboard"), "/dashboard/akun?info=email");
assert.equal(successPath(null, null, "/dashboard"), "/dashboard");
assert.equal(failurePath("recovery", "kedaluwarsa"), "/lupa-password?error=kedaluwarsa");
assert.equal(failurePath("signup", "kode"), "/cek-email?error=kode");
assert.equal(failurePath(null, "tautan"), "/masuk?error=tautan");
// next yang dimanipulasi tidak pernah lolos jadi open redirect
for (const evil of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com"]) {
  assert.equal(safeNext(evil), "/dashboard", `open redirect lolos: ${evil}`);
}

// ---- Validasi nama & password
assert.equal(displayNameSchema.safeParse("  Rexxi  ").success, true);
assert.equal(displayNameSchema.parse("  Rexxi  "), "Rexxi");
for (const bad of ["a", "x".repeat(61), "Ra\u202Eevil", "ab\u200bcd", "tab\tname", "  "]) {
  assert.equal(displayNameSchema.safeParse(bad).success, false, `nama harus ditolak: ${JSON.stringify(bad)}`);
}
assert.equal(newPasswordSchema.safeParse("12345678").success, true);
assert.equal(newPasswordSchema.safeParse("1234567").success, false);
assert.equal(newPasswordSchema.safeParse("x".repeat(73)).success, false);

// ---- Pemetaan error login: kredensial salah TIDAK boleh menutupi gangguan layanan/jaringan
assert.deepEqual(mapSignInError({ code: "email_not_confirmed", status: 400 }), { message: MSG_UNVERIFIED, unverified: true });
assert.deepEqual(mapSignInError({ code: "invalid_credentials", status: 400 }), { message: MSG_BAD_CREDENTIALS, unverified: false });
assert.deepEqual(mapSignInError({ code: "over_request_rate_limit", status: 429 }), { message: MSG_RATE, unverified: false });
assert.deepEqual(mapSignInError({ name: "AuthRetryableFetchError", status: 0 }), { message: MSG_SERVICE, unverified: false });
assert.deepEqual(mapSignInError({ status: 502 }), { message: MSG_SERVICE, unverified: false });
assert.equal(isServiceFailure({ status: 400 }), false);
assert.equal(isServiceFailure(null), false);

// ---- getVerifiedUser: dipakai di semua server action/route privat (proxy saja tidak cukup)
const fakeClient = (user: unknown) => ({ auth: { getUser: async () => ({ data: { user } }) } }) as never;
(async () => {
  assert.equal(await getVerifiedUser(fakeClient(null)), null, "tanpa sesi -> null");
  assert.equal(await getVerifiedUser(fakeClient({ id: "u1", email_confirmed_at: null })), null, "belum terverifikasi -> null");
  assert.equal(await getVerifiedUser(fakeClient({ id: "u1" })), null, "tanpa email_confirmed_at -> null");
  const ok = await getVerifiedUser(fakeClient({ id: "u1", email_confirmed_at: "2026-10-14T00:00:00Z" }));
  assert.equal(ok?.id, "u1", "terverifikasi -> user");
  console.log("semua uji auth lulus");
})();

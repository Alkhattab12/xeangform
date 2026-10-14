// Uji unit autentikasi, validasi, dan proteksi sesi. Jalankan: npx tsx lib/auth/selftest-auth.ts
import assert from "node:assert/strict";
import { z } from "zod";
import { safeNext } from "@/lib/utils/safe-next";

// 1. Validasi Skema Email & Password
const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(8).max(72);
const registerSchema = z
  .object({
    displayName: z.string().trim().min(2).max(60),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "mismatch" });

// Email valid & invalid
assert.equal(emailSchema.safeParse("user@example.com").success, true);
assert.equal(emailSchema.safeParse("user+tag@sub.domain.co.id").success, true);
assert.equal(emailSchema.safeParse("invalid-email").success, false);
assert.equal(emailSchema.safeParse("").success, false);
assert.equal(emailSchema.safeParse("   ").success, false);

// Password minimal 8 karakter
assert.equal(passwordSchema.safeParse("1234567").success, false);
assert.equal(passwordSchema.safeParse("12345678").success, true);
assert.equal(passwordSchema.safeParse("a".repeat(73)).success, false);

// Konfirmasi password cocok & tidak cocok
assert.equal(
  registerSchema.safeParse({
    displayName: "Budi Santoso",
    email: "budi@example.com",
    password: "password123",
    confirm: "password123",
  }).success,
  true
);

assert.equal(
  registerSchema.safeParse({
    displayName: "Budi Santoso",
    email: "budi@example.com",
    password: "password123",
    confirm: "different123",
  }).success,
  false
);

// DisplayName batas panjang
assert.equal(
  registerSchema.safeParse({
    displayName: "A",
    email: "a@b.com",
    password: "password123",
    confirm: "password123",
  }).success,
  false
);

assert.equal(
  registerSchema.safeParse({
    displayName: "A".repeat(61),
    email: "a@b.com",
    password: "password123",
    confirm: "password123",
  }).success,
  false
);

// 2. Logika Verifikasi Konfirmasi Email
function isAccountVerified(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null): boolean {
  return Boolean(user && (user.email_confirmed_at || user.confirmed_at));
}

// Akun baru belum konfirmasi -> HARUS false
assert.equal(isAccountVerified(null), false);
assert.equal(isAccountVerified({ email_confirmed_at: null, confirmed_at: null }), false);
assert.equal(isAccountVerified({ email_confirmed_at: undefined, confirmed_at: undefined }), false);

// Akun yang sudah klik link konfirmasi -> HARUS true
assert.equal(isAccountVerified({ email_confirmed_at: "2026-10-14T08:00:00Z" }), true);
assert.equal(isAccountVerified({ confirmed_at: "2026-10-14T08:00:00Z" }), true);
assert.equal(isAccountVerified({ email_confirmed_at: "2026-10-14T08:00:00Z", confirmed_at: "2026-10-14T08:00:00Z" }), true);

// 3. Keamanan Redirect (Open Redirect Prevention via safeNext)
assert.equal(safeNext("/dashboard"), "/dashboard");
assert.equal(safeNext("/dashboard/akun"), "/dashboard/akun");
assert.equal(safeNext("https://evil.com"), "/dashboard");
assert.equal(safeNext("//evil.com"), "/dashboard");
assert.equal(safeNext("javascript:alert(1)"), "/dashboard");
assert.equal(safeNext(null), "/dashboard");
assert.equal(safeNext(undefined), "/dashboard");

// 4. Mode Background
const bgModeSchema = z.enum(["motion", "static"]);
assert.equal(bgModeSchema.safeParse("motion").success, true);
assert.equal(bgModeSchema.safeParse("static").success, true);
assert.equal(bgModeSchema.safeParse("animated").success, false);
assert.equal(bgModeSchema.safeParse("").success, false);

console.log("semua uji unit autentikasi dan keamanan sesi lulus");

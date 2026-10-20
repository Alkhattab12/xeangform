"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isServiceFailure, mapSignInError, MSG_SERVICE } from "@/lib/auth/errors";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { PENDING_EMAIL_COOKIE, RESEND_COOLDOWN_SECONDS } from "@/lib/auth/pending";
import { isEmailVerified } from "@/lib/auth/verified";
import { getClientIpHash } from "@/lib/forms/client-ip";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

export type AuthState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: { email?: string; displayName?: string };
  /** Diisi saat login ditolak karena email belum terkonfirmasi: UI menawarkan kirim ulang. */
  unverifiedEmail?: string;
  /** Detik jeda sebelum kirim ulang boleh dicoba lagi. */
  resendCooldown?: number;
} | null;

const email = z.string().trim().toLowerCase().email("Masukkan email yang valid, contoh: nama@email.com.");
const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

const loginSchema = z.object({ email, password: z.string().min(1, "Isi kata sandi.") });
const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60, "Nama maksimal 60 karakter."),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi kata sandi tidak sama." });
const forgotSchema = z.object({ email });
const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi kata sandi tidak sama." });

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(error.flatten().fieldErrors)) {
    if (msgs && msgs[0]) out[k] = msgs[0];
  }
  return out;
}

const siteOrigin = getSiteOrigin;

async function rememberPendingEmail(addr: string) {
  const jar = await cookies();
  jar.set(PENDING_EMAIL_COOKIE, addr, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  // Pembatas laju percobaan masuk: 10x/menit per IP, 5x/menit per alamat email
  const ipHash = await getClientIpHash();
  if (
    isRateLimited(`signin-ip:${ipHash}`, 10, 60_000) ||
    isRateLimited(`signin-email:${parsed.data.email}`, 5, 60_000)
  ) {
    return { error: "Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const mapped = mapSignInError(error);
    if (mapped.unverified) await rememberPendingEmail(parsed.data.email);
    return { error: mapped.message, values, unverifiedEmail: mapped.unverified ? parsed.data.email : undefined };
  }
  // Pertahanan berlapis: jika library tetap membuat sesi untuk akun yang belum terverifikasi, cabut sesinya.
  if (!isEmailVerified(data.user)) {
    await supabase.auth.signOut();
    await rememberPendingEmail(parsed.data.email);
    return {
      error: "Email belum dikonfirmasi. Buka kotak masuk kamu dan klik tautan konfirmasi.",
      values,
      unverifiedEmail: parsed.data.email,
    };
  }
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email"), displayName: str(fd, "displayName") };
  const parsed = registerSchema.safeParse({
    displayName: values.displayName,
    email: values.email,
    password: str(fd, "password"),
    confirm: str(fd, "confirm"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const next = safeNext(fd.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${origin}/auth/callback?flow=signup&next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (isServiceFailure(error)) return { error: MSG_SERVICE, values };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Terlalu banyak email terkirim. Tunggu beberapa menit lalu coba lagi.", values };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang." }, values };
    }
    return { error: "Pendaftaran gagal. Coba lagi sebentar lagi.", values };
  }

  if (data.session) {
    // Supabase menerbitkan sesi langsung = "Confirm email" MATI di dashboard Supabase. Kode tidak bisa memaksanya dari sisi
    // aplikasi; aktifkan di Authentication > Providers > Email (lihat docs/AUTH_SETUP.md).
    console.warn("auth_signup_session_issued: konfirmasi email tampaknya dimatikan di Supabase");
    if (isEmailVerified(data.user)) redirect(next);
    await supabase.auth.signOut(); // akun belum terverifikasi tidak boleh memegang sesi
  }

  // Respons sama untuk email baru maupun yang sudah terdaftar (tidak membocorkan keberadaan akun)
  await rememberPendingEmail(parsed.data.email);
  redirect(`/cek-email?next=${encodeURIComponent(next)}`);
}

export async function resendConfirmation(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const jar = await cookies();
  const raw = str(fd, "email") || jar.get(PENDING_EMAIL_COOKIE)?.value || "";
  const parsed = forgotSchema.safeParse({ email: raw });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email: raw } };
  const addr = parsed.data.email;
  const values = { email: addr };

  // Pembatas aplikasi (di atas pembatas bawaan Supabase): 1x/menit per email, 10x/jam per IP
  if (isRateLimited(`resend:${addr}`, 1, RESEND_COOLDOWN_SECONDS * 1000) || isRateLimited(`resend-ip:${await getClientIpHash()}`, 10, 3_600_000)) {
    return { error: "Tunggu sekitar satu menit sebelum meminta email baru.", resendCooldown: RESEND_COOLDOWN_SECONDS, values };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const next = safeNext(fd.get("next"));
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: addr,
    options: { emailRedirectTo: `${origin}/auth/callback?flow=signup&next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Batas pengiriman email tercapai. Tunggu beberapa menit lalu coba lagi.", resendCooldown: RESEND_COOLDOWN_SECONDS, values };
    }
    if (isServiceFailure(error)) return { error: "Gagal mengirim email. Periksa koneksi lalu coba lagi.", values };
    // Kegagalan lain (mis. akun tidak ditemukan/sudah terkonfirmasi) disamarkan agar tidak membocorkan status akun
  }
  await rememberPendingEmail(addr);
  return {
    message: `Jika ${addr} sedang menunggu konfirmasi, email baru sudah dikirim. Periksa kotak masuk dan folder spam.`,
    resendCooldown: RESEND_COOLDOWN_SECONDS,
    values,
  };
}

export async function forgotPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  // Pembatas laju permintaan reset sandi: 5x/menit per IP, 3x/menit per email
  const ipHash = await getClientIpHash();
  if (
    isRateLimited(`forgot-ip:${ipHash}`, 5, 60_000) ||
    isRateLimited(`forgot-email:${parsed.data.email}`, 3, 60_000)
  ) {
    return { error: "Terlalu banyak permintaan reset kata sandi. Tunggu sebentar lalu coba lagi.", values };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?flow=recovery&next=/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.", values };
  }
  if (error && isServiceFailure(error)) return { error: MSG_SERVICE, values };
  return { message: "Jika email itu terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.", values };
}

export async function resetPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({ password: str(fd, "password"), confirm: str(fd, "confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: error.code === "same_password" ? "Kata sandi baru harus berbeda dari yang lama." : "Gagal mengubah kata sandi. Coba lagi.",
    };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

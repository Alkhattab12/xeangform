"use server";

import { createClient as createJsClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isServiceFailure, MSG_SERVICE } from "@/lib/auth/errors";
import { displayNameSchema, newPasswordSchema } from "@/lib/auth/passwords";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { isEmailVerified } from "@/lib/auth/verified";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AccountState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Hanya nilai non-rahasia. Kata sandi TIDAK PERNAH dikembalikan ke klien. */
  values?: { displayName?: string; email?: string };
} | null;

const MSG_SESSION = "Sesi berakhir. Muat ulang halaman lalu masuk kembali.";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Pengguna harus login DAN emailnya terverifikasi (status dari Supabase Auth). */
async function requireVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isEmailVerified(user)) return { supabase, user: null };
  return { supabase, user };
}

/**
 * Memeriksa kata sandi saat ini memakai klien TERPISAH tanpa penyimpanan sesi, sehingga sesi pengguna tidak tersentuh.
 * Sesi percobaan dicabut dengan scope "local" (hanya sesi percobaan itu, bukan seluruh sesi pengguna).
 */
async function verifyCurrentPassword(email: string, password: string): Promise<"ok" | "wrong" | "unavailable"> {
  const { url, key } = supabaseEnv();
  const probe = createJsClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return isServiceFailure(error) ? "unavailable" : "wrong";
  await probe.auth.signOut({ scope: "local" });
  return "ok";
}

export async function updateDisplayName(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const raw = str(fd, "displayName");
  const parsed = displayNameSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: { displayName: parsed.error.issues[0]?.message ?? "Nama tidak valid." }, values: { displayName: raw } };
  const name = parsed.data;

  const { supabase, user } = await requireVerifiedUser();
  if (!user) return { error: MSG_SESSION, values: { displayName: raw } };

  // RLS (profiles_update_own) memastikan hanya baris milik sendiri yang bisa diubah; kolom lain tidak disentuh
  const { data, error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id).select("id");
  if (error) return { error: "Gagal menyimpan nama. Coba lagi.", values: { displayName: raw } };

  if (!data || data.length === 0) {
    // Profil belum terbentuk (mis. akun lama/trigger gagal): buat via server, id hanya dari sesi terverifikasi
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return { error: "Profil belum tersedia dan tidak dapat dibuat otomatis. Hubungi dukungan.", values: { displayName: raw } };
    }
    const { error: upErr } = await admin.from("profiles").upsert({ id: user.id, display_name: name }, { onConflict: "id" });
    if (upErr) return { error: "Gagal menyimpan nama. Coba lagi.", values: { displayName: raw } };
  }

  await supabase.auth.updateUser({ data: { display_name: name } }); // sinkronkan metadata (best-effort, hasilnya tidak menentukan)
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Nama berhasil disimpan.", values: { displayName: name } };
}

const emailSchema = z.string().trim().toLowerCase().email("Masukkan email yang valid, contoh: nama@email.com.");

export async function changeEmail(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const rawEmail = str(fd, "newEmail");
  const parsed = emailSchema.safeParse(rawEmail);
  const current = str(fd, "currentPassword");
  const fe: Record<string, string> = {};
  if (!parsed.success) fe.newEmail = parsed.error.issues[0]?.message ?? "Email tidak valid.";
  if (!current) fe.currentPassword = "Isi kata sandi saat ini.";
  if (Object.keys(fe).length) return { fieldErrors: fe, values: { email: rawEmail } };
  const newEmail = parsed.data as string;

  const { supabase, user } = await requireVerifiedUser();
  if (!user || !user.email) return { error: MSG_SESSION, values: { email: rawEmail } };
  if (newEmail === user.email.toLowerCase()) return { fieldErrors: { newEmail: "Email baru sama dengan email saat ini." }, values: { email: rawEmail } };

  if (isRateLimited(`acct-email:${user.id}`, 3, 10 * 60_000)) return { error: "Terlalu banyak percobaan. Tunggu beberapa menit.", values: { email: rawEmail } };
  if (isRateLimited(`acct-pw:${user.id}`, 5, 10 * 60_000)) return { error: "Terlalu banyak percobaan kata sandi. Tunggu beberapa menit.", values: { email: rawEmail } };

  const check = await verifyCurrentPassword(user.email, current);
  if (check === "unavailable") return { error: MSG_SERVICE, values: { email: rawEmail } };
  if (check === "wrong") return { fieldErrors: { currentPassword: "Kata sandi saat ini salah." }, values: { email: rawEmail } };

  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/auth/callback?flow=email_change&next=${encodeURIComponent("/dashboard/akun")}` },
  );
  if (error) {
    if (error.code === "over_email_send_rate_limit") return { error: "Batas pengiriman email tercapai. Tunggu beberapa menit lalu coba lagi.", values: { email: rawEmail } };
    if (isServiceFailure(error)) return { error: MSG_SERVICE, values: { email: rawEmail } };
    // email_exists dan lainnya: pesan netral agar tidak membocorkan akun orang lain
    return { error: "Email itu tidak dapat dipakai. Coba email lain.", values: { email: rawEmail } };
  }

  revalidatePath("/dashboard/akun");
  return {
    ok: true,
    message: `Tautan konfirmasi dikirim ke ${newEmail}. Email akunmu BELUM berubah sampai kamu mengklik tautan itu. Jika diminta, konfirmasi juga dikirim ke email lama.`,
  };
}

export async function changePassword(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const current = str(fd, "currentPassword");
  const next = str(fd, "newPassword");
  const confirm = str(fd, "confirm");

  const fe: Record<string, string> = {};
  if (!current) fe.currentPassword = "Isi kata sandi saat ini.";
  const pw = newPasswordSchema.safeParse(next);
  if (!pw.success) fe.newPassword = pw.error.issues[0]?.message ?? "Kata sandi tidak valid.";
  else if (next === current) fe.newPassword = "Kata sandi baru harus berbeda dari yang lama.";
  if (next !== confirm) fe.confirm = "Konfirmasi kata sandi tidak sama.";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  const { supabase, user } = await requireVerifiedUser();
  if (!user || !user.email) return { error: MSG_SESSION };

  if (isRateLimited(`acct-pw:${user.id}`, 5, 10 * 60_000)) return { error: "Terlalu banyak percobaan kata sandi. Tunggu beberapa menit." };

  const check = await verifyCurrentPassword(user.email, current);
  if (check === "unavailable") return { error: MSG_SERVICE };
  if (check === "wrong") return { fieldErrors: { currentPassword: "Kata sandi saat ini salah." } };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { newPassword: "Kata sandi baru harus berbeda dari yang lama." } };
    if (error.code === "weak_password") return { fieldErrors: { newPassword: "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang." } };
    if (error.code === "reauthentication_needed") return { error: "Demi keamanan, keluar lalu masuk kembali, kemudian ulangi perubahan kata sandi." };
    if (isServiceFailure(error)) return { error: MSG_SERVICE };
    return { error: "Gagal mengubah kata sandi. Coba lagi." };
  }

  // Cabut sesi di perangkat lain; sesi ini tetap aktif. Gagal di sini tidak membatalkan perubahan.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Kata sandi berhasil diubah. Sesi di perangkat lain telah dikeluarkan." };
}

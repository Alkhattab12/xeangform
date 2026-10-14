"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-next";

export type AuthState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: { email?: string; displayName?: string };
  unconfirmed?: boolean;
  registeredSuccess?: boolean;
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

const profileNameSchema = z.object({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60, "Nama maksimal 60 karakter."),
});

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

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const isUnconfirmed =
      error.code === "email_not_confirmed" ||
      error.message?.toLowerCase().includes("email not confirmed");
    return {
      error: isUnconfirmed
        ? "Email belum dikonfirmasi. Buka kotak masuk kamu dan klik tautan konfirmasi untuk mengaktifkan akun."
        : "Email atau kata sandi salah.",
      values,
      unconfirmed: isUnconfirmed,
    };
  }

  // Validasi status konfirmasi dari user session
  const user = data.user;
  const isConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  if (!isConfirmed) {
    await supabase.auth.signOut();
    return {
      error: "Email belum dikonfirmasi. Buka kotak masuk kamu dan klik tautan konfirmasi untuk mengaktifkan akun.",
      values,
      unconfirmed: true,
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
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Terlalu banyak email terkirim. Tunggu beberapa menit lalu coba lagi.", values };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang." }, values };
    }
    return { error: "Pendaftaran gagal. Coba lagi sebentar lagi.", values };
  }

  // Jika akun langsung terkonfirmasi (misal pada setting dev tanpa email confirmation)
  const isConfirmed = Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at);
  if (isConfirmed && data.session) {
    redirect(next);
  }

  // Jika email belum dikonfirmasi, pastikan tidak ada sesi aktif yang memberi akses privat
  if (data.session) {
    await supabase.auth.signOut();
  }

  return {
    message: `Kami telah mengirim tautan konfirmasi ke ${parsed.data.email}. Buka kotak masuk email kamu dan klik tautannya untuk mengaktifkan akun.`,
    values: { email: parsed.data.email },
    unconfirmed: true,
    registeredSuccess: true,
  };
}

export async function resendConfirmationEmail(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const targetEmail = str(fd, "email").trim().toLowerCase();
  const parsed = email.safeParse(targetEmail);
  if (!parsed.success) {
    return { error: "Masukkan alamat email yang valid untuk mengirim ulang konfirmasi." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return {
        error: "Terlalu banyak permintaan pengiriman email. Mohon tunggu beberapa saat sebelum mengirim ulang.",
        values: { email: parsed.data },
        unconfirmed: true,
      };
    }
    return {
      error: "Gagal mengirim ulang email konfirmasi. Pastikan alamat email benar atau coba lagi nanti.",
      values: { email: parsed.data },
      unconfirmed: true,
    };
  }

  return {
    message: `Tautan konfirmasi baru berhasil dikirim ke ${parsed.data}. Silakan periksa kotak masuk atau folder spam kamu.`,
    values: { email: parsed.data },
    unconfirmed: true,
  };
}

export async function forgotPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.", values };
  }
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

export async function updateProfileName(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (!user.email_confirmed_at && !user.confirmed_at)) {
    return { error: "Sesi tidak sah atau email belum terverifikasi." };
  }

  const parsed = profileNameSchema.safeParse({ displayName: str(fd, "displayName") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const displayName = parsed.data.displayName;

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileErr) {
    return { error: "Gagal menyimpan perubahan nama profil." };
  }

  await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  return { message: "Nama profil berhasil diperbarui!" };
}

export async function updateUserEmail(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (!user.email_confirmed_at && !user.confirmed_at)) {
    return { error: "Sesi tidak sah atau email belum terverifikasi." };
  }

  const targetEmail = str(fd, "newEmail");
  const parsed = email.safeParse(targetEmail);
  if (!parsed.success) {
    return { fieldErrors: { newEmail: "Masukkan alamat email yang valid." } };
  }

  if (parsed.data === user.email?.toLowerCase()) {
    return { fieldErrors: { newEmail: "Email baru tidak boleh sama dengan email saat ini." } };
  }

  const origin = await siteOrigin();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${origin}/auth/callback?next=/dashboard/akun` }
  );

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Terlalu banyak permintaan pergantian email. Mohon tunggu beberapa saat." };
    }
    return { error: "Gagal meminta pergantian email. Pastikan email belum terdaftar di akun lain." };
  }

  return {
    message: `Tautan konfirmasi telah dikirim ke ${parsed.data}. Buka email baru tersebut untuk menyelesaikan perubahan.`,
  };
}

export async function changeUserPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (!user.email_confirmed_at && !user.confirmed_at)) {
    return { error: "Sesi tidak sah atau email belum terverifikasi." };
  }

  const parsed = resetSchema.safeParse({ password: str(fd, "password"), confirm: str(fd, "confirm") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Kata sandi baru harus berbeda dari kata sandi saat ini." };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "Kata sandi terlalu lemah." } };
    }
    return { error: "Gagal memperbarui kata sandi. Coba lagi sebentar lagi." };
  }

  return { message: "Kata sandi berhasil diperbarui dengan aman!" };
}

export async function saveBackgroundPreference(mode: "motion" | "static"): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || (!user.email_confirmed_at && !user.confirmed_at)) return;

    await supabase
      .from("profiles")
      .update({ background_mode: mode })
      .eq("id", user.id);
  } catch {
    // Abaikan jika env belum diisi atau offline
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

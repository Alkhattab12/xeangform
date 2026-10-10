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

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const values = { email: str(fd, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Email belum dikonfirmasi. Buka kotak masuk kamu dan klik tautan konfirmasi."
          : "Email atau kata sandi salah.",
      values,
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
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
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

  if (data.session) redirect("/dashboard"); // konfirmasi email dimatikan di Supabase

  // Pesan sama untuk email baru maupun yang sudah terdaftar (tidak membocorkan keberadaan akun)
  return { message: `Kami mengirim tautan konfirmasi ke ${parsed.data.email}. Buka email itu dan klik tautannya untuk mengaktifkan akun.` };
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

import { z } from "zod";

/** Aturan kata sandi baru (sama dengan registrasi): 8–72 karakter. */
export const newPasswordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(60, "Nama maksimal 60 karakter.")
  // tolak karakter kontrol/format tak terlihat (mis. zero-width, RTL override) yang dipakai untuk menyamarkan nama
  .refine((v) => !/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(v), "Nama mengandung karakter yang tidak diizinkan.");

"use server";

import { customAlphabet } from "nanoid";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";
import { isOwnedAudioPath } from "@/lib/audio/safe-src";
import {
  playlistTrackSchema,
  type PlaylistTrack,
} from "@/lib/forms/schema";
import { detectAudioFormatFromBytes } from "@/lib/audio/engine";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export type AudioUploadResult =
  | { ok: true; track: PlaylistTrack }
  | { ok: false; error: string };

export type UserLibraryResult =
  | { ok: true; tracks: PlaylistTrack[] }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return clean.slice(-80);
}

// Tipe MIME ditentukan dari format hasil deteksi magic bytes (bukan dari file.type kiriman browser)
const MIME_BY_FORMAT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

/**
 * Mengunggah file audio ke Supabase Storage (bucket 'form-audio')
 * dan mencatatnya ke pustaka audio pengguna.
 */
export async function uploadAudioTrackAction(formData: FormData): Promise<AudioUploadResult> {
  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu untuk mengunggah audio." };
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Berkas audio tidak ditemukan." };
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return {
        ok: false,
        error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 15 MB.`,
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 32));
    const format = detectAudioFormatFromBytes(headerBytes);

    if (!format) {
      return {
        ok: false,
        error: "Format berkas tidak didukung atau header rusak. Gunakan file MP3, WAV, OGG, atau M4A/AAC.",
      };
    }

    const customTitle = formData.get("title");
    const title =
      typeof customTitle === "string" && customTitle.trim()
        ? customTitle.trim().slice(0, 120)
        : file.name.replace(/\.[^/.]+$/, "").slice(0, 120);

    const durationRaw = formData.get("duration");
    const duration = typeof durationRaw === "string" ? Math.max(0, parseFloat(durationRaw) || 0) : 0;

    const safeName = sanitizeFilename(file.name);
    const trackUniqueId = nanoid();
    const storagePath = `${user.id}/${trackUniqueId}_${safeName}`;

    // Unggah ke Supabase Storage memakai sesi user: policy storage (form_audio_owner_insert) memastikan
    // hanya folder `<user.id>/` yang bisa ditulis. Bucket dibuat oleh migrasi 0005.
    let publicUrl = "";
    try {
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = MIME_BY_FORMAT[format] ?? "audio/mpeg";

      const { error: uploadErr } = await supabase.storage
        .from("form-audio")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

      if (uploadErr) {
        const m = uploadErr.message?.toLowerCase() ?? "";
        if (m.includes("bucket not found") || (uploadErr as { statusCode?: string }).statusCode === "404") {
          return {
            ok: false,
            error: "Bucket 'form-audio' belum ada. Jalankan migrasi 0005_form_audio.sql atau buat bucket 'form-audio' (Public) di dashboard Supabase.",
          };
        }
        console.error("Supabase Storage upload error:", uploadErr);
        return {
          ok: false,
          error: `Gagal menyimpan ke Supabase Storage: ${uploadErr.message || "Izin penyimpanan ditolak"}`,
        };
      }

      const { data: pubData } = supabase.storage.from("form-audio").getPublicUrl(storagePath);
      publicUrl = pubData.publicUrl;
    } catch (storageErr) {
      console.warn("Storage upload exception:", storageErr);
      const msg = storageErr instanceof Error ? storageErr.message : "Kesalahan server penyimpanan";
      return {
        ok: false,
        error: `Gagal mengunggah file ke cloud: ${msg}`,
      };
    }

    const track: PlaylistTrack = {
      id: trackUniqueId,
      title,
      artist: "Diunggah oleh Pemilik Form",
      src: publicUrl,
      storagePath,
      duration: Math.round(duration),
      sizeBytes: file.size,
      format,
      license: "Hak Cipta Pemilik Form",
      source: "upload",
    };

    // Rekam ke user_audio_tracks. supabase-js TIDAK melempar saat gagal, jadi periksa `error` secara eksplisit.
    // Non-fatal: pustaka tetap bisa dibaca lewat agregasi playlist form jika tabel belum dimigrasikan.
    const { error: libErr } = await supabase.from("user_audio_tracks").insert({
      owner_id: user.id,
      title: track.title,
      artist: track.artist,
      storage_path: track.storagePath,
      public_url: track.src,
      mime_type: MIME_BY_FORMAT[format] ?? "audio/mpeg",
      size_bytes: file.size,
      duration: track.duration,
      format: track.format,
    });
    if (libErr) console.warn("user_audio_tracks insert gagal (apakah migrasi 0005 sudah dijalankan?):", libErr.message);

    return { ok: true, track };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengunggah berkas audio.";
    return { ok: false, error: msg };
  }
}

/**
 * Mengambil pustaka audio yang pernah diunggah oleh pengguna
 */
export async function getUserAudioLibraryAction(): Promise<UserLibraryResult> {
  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu." };
    }

    const db = supabase; // RLS (user_audio_owner_all, forms_owner_all) membatasi ke data milik user

    // 1. Coba baca dari tabel user_audio_tracks
    const { data: rows, error } = await db
      .from("user_audio_tracks")
      .select("id,title,artist,storage_path,public_url,size_bytes,duration,format")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const tracks: PlaylistTrack[] = rows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        artist: (r.artist as string) || "Diunggah oleh Pemilik Form",
        src: r.public_url as string,
        storagePath: r.storage_path as string,
        duration: (r.duration as number) || 0,
        sizeBytes: r.size_bytes as number,
        format: r.format as "mp3" | "wav" | "ogg" | "m4a" | "aac" | "unknown",
        license: "Hak Cipta Pemilik Form",
        source: "upload",
      }));
      return { ok: true, tracks };
    }

    // 2. Fallback: agregasi dari form milik pengguna yang sudah ada
    const { data: userForms } = await db
      .from("forms")
      .select("settings_json")
      .eq("owner_id", user.id);

    const fallbackTracks: PlaylistTrack[] = [];
    const seenSrc = new Set<string>();

    if (Array.isArray(userForms)) {
      for (const f of userForms) {
        const s = f.settings_json as { audio?: { playlist?: PlaylistTrack[] } };
        const playlist = s?.audio?.playlist;
        if (Array.isArray(playlist)) {
          for (const t of playlist) {
            if (t.source === "upload" && t.src && !seenSrc.has(t.src)) {
              seenSrc.add(t.src);
              fallbackTracks.push(t);
            }
          }
        }
      }
    }

    return { ok: true, tracks: fallbackTracks };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat pustaka audio.";
    return { ok: false, error: msg };
  }
}

/**
 * Menghapus audio yang diunggah dari storage.
 * Ditolak jika berkas masih dipakai di playlist form milik user (mis. form hasil duplikasi), supaya tidak ada form yang
 * tiba-tiba kehilangan lagunya.
 */
export async function deleteUploadedAudioAction(storagePath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu." };
    }

    // Path harus persis `<user.id>/<nama>`: satu level, tanpa "..", "//" atau backslash (cegah menyentuh folder orang lain)
    if (!isOwnedAudioPath(storagePath, user.id)) {
      return { ok: false, error: "Akses ditolak: berkas bukan milik Anda." };
    }

    // Cek pemakaian di semua form milik user
    const { data: forms, error: formsErr } = await supabase.from("forms").select("title,settings_json").eq("owner_id", user.id);
    if (formsErr) return { ok: false, error: "Gagal memeriksa pemakaian lagu. Coba lagi." };
    const usedIn = (forms ?? []).filter((f) => {
      const playlist = (f.settings_json as { audio?: { playlist?: PlaylistTrack[] } } | null)?.audio?.playlist;
      return Array.isArray(playlist) && playlist.some((t) => t?.storagePath === storagePath);
    });
    if (usedIn.length > 0) {
      const names = usedIn
        .slice(0, 3)
        .map((f) => `"${(f.title as string) || "Tanpa judul"}"`)
        .join(", ");
      const more = usedIn.length > 3 ? ` dan ${usedIn.length - 3} form lain` : "";
      return {
        ok: false,
        error: `Lagu ini masih dipakai di ${names}${more}. Hapus dari playlist form tersebut (lalu simpan), baru hapus permanen.`,
      };
    }

    const { error: rmErr } = await supabase.storage.from("form-audio").remove([storagePath]);
    if (rmErr) return { ok: false, error: "Gagal menghapus berkas audio." };

    await supabase.from("user_audio_tracks").delete().eq("storage_path", storagePath).eq("owner_id", user.id);

    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus berkas audio." };
  }
}

"use server";

import { customAlphabet } from "nanoid";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Mengunggah file audio ke Supabase Storage (bucket 'form-audio')
 * dan mencatatnya ke pustaka audio pengguna.
 */
export async function uploadAudioTrackAction(formData: FormData): Promise<AudioUploadResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const formIdRaw = formData.get("formId");
    const formId = typeof formIdRaw === "string" && formIdRaw ? formIdRaw : "library";
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

    // Unggah ke Supabase Storage
    let publicUrl = "";
    try {
      const admin = createAdminClient();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || `audio/${format}`;

      const { data: uploadData, error: uploadErr } = await admin.storage
        .from("form-audio")
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadErr) {
        console.error("Supabase Storage upload error:", uploadErr);
        return { ok: false, error: "Gagal menyimpan file audio ke server penyimpanan." };
      }

      const { data: pubData } = admin.storage.from("form-audio").getPublicUrl(storagePath);
      publicUrl = pubData.publicUrl;
    } catch (storageErr) {
      console.warn("Storage upload exception (fallback):", storageErr);
      return {
        ok: false,
        error: "Layanan penyimpanan cloud belum siap atau kunci service role belum disetel.",
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

    // Rekam ke user_audio_tracks jika tabel tersedia
    try {
      const admin = createAdminClient();
      await admin.from("user_audio_tracks").insert({
        id: undefined,
        owner_id: user.id,
        title: track.title,
        artist: track.artist,
        storage_path: track.storagePath,
        public_url: track.src,
        mime_type: file.type || `audio/${format}`,
        size_bytes: file.size,
        duration: track.duration,
        format: track.format,
      });
    } catch (dbErr) {
      // Non-fatal jika tabel belum dimigrasikan
      console.info("Info: user_audio_tracks belum dimigrasi atau belum aktif:", dbErr);
    }

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu." };
    }

    const admin = createAdminClient();

    // 1. Coba baca dari tabel user_audio_tracks
    const { data: rows, error } = await admin
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
    const { data: userForms } = await admin
      .from("forms")
      .select("settings_json")
      .eq("owner_id", user.id);

    const fallbackTracks: PlaylistTrack[] = [];
    const seenSrc = new Set<string>();

    if (userForms) {
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
    const msg = err instanceof Error ? err.message : "Gagal mengambil pustaka audio.";
    return { ok: false, error: msg };
  }
}

/**
 * Menghapus audio yang diunggah dari storage
 */
export async function deleteUploadedAudioAction(storagePath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Silakan masuk terlebih dahulu." };
    }

    // Pastikan path diawali dengan user.id untuk mencegah menghapus file orang lain
    if (!storagePath.startsWith(`${user.id}/`)) {
      return { ok: false, error: "Akses ditolak: berkas bukan milik Anda." };
    }

    const admin = createAdminClient();

    // Hapus dari Storage
    await admin.storage.from("form-audio").remove([storagePath]);

    // Hapus dari tabel jika ada
    await admin.from("user_audio_tracks").delete().eq("storage_path", storagePath).eq("owner_id", user.id);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Gagal menghapus berkas audio." };
  }
}

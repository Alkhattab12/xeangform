"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, File as FileIcon, Loader2, Trash2, Upload } from "lucide-react";
import { prepareFileUpload } from "@/app/actions/upload";
import { formatFileSize, getAcceptString, isAllowedFile, type UploadedFile } from "@/lib/forms/files";
import type { FormField } from "@/lib/forms/schema";

type Props = {
  field: FormField;
  slug: string;
  value?: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  error?: string;
  disabled?: boolean;
};

const CATEGORY_NAMES: Record<string, string> = {
  pdf: "PDF",
  image: "Gambar",
  document: "Dokumen",
  spreadsheet: "Spreadsheet",
};

export function FileUploadField({ field, slug, value = [], onChange, error, disabled }: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const maxFiles = field.file?.maxFiles ?? 1;
  const maxSizeMb = field.file?.maxSizeMb ?? 10;
  const acceptCategories = field.file?.accept ?? ["pdf", "image"];
  const acceptAttr = getAcceptString(acceptCategories);

  const acceptLabels = acceptCategories.map((c) => CATEGORY_NAMES[c] ?? c).join(", ");
  const currentCount = value.length;
  const canUploadMore = currentCount < maxFiles;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (selected.length === 0) return;

    setLocalError(null);

    // Cek batas total berkas
    if (currentCount + selected.length > maxFiles) {
      setLocalError(`Maksimal ${maxFiles} berkas untuk kolom ini.`);
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    setUploading(true);

    try {
      const newFiles: UploadedFile[] = [...value];

      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        setUploadProgress(`Mengunggah ${file.name} (${i + 1}/${selected.length})…`);

        // 1. Cek ukuran di browser
        if (file.size > maxBytes) {
          setLocalError(`Berkas "${file.name}" melebihi batas ukuran maksimal ${maxSizeMb} MB.`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }

        // 2. Cek tipe berkas di browser
        const mime = file.type || "application/octet-stream";
        if (!isAllowedFile(file.name, mime, acceptCategories)) {
          setLocalError(`Tipe berkas "${file.name}" tidak diizinkan. Hanya menerima: ${acceptLabels}.`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }

        // 3. Minta Signed Upload URL ke server
        const prep = await prepareFileUpload(slug, field.id, {
          filename: file.name,
          mimeType: mime,
          sizeBytes: file.size,
        });

        if (!prep.ok) {
          setLocalError(prep.error);
          setUploading(false);
          setUploadProgress(null);
          return;
        }

        // 4. Unggah berkas langsung ke Supabase Storage via PUT
        const uploadRes = await fetch(prep.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": mime,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          setLocalError(`Gagal mengunggah "${file.name}". Periksa koneksi internet.`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }

        newFiles.push({
          storagePath: prep.storagePath,
          originalFilename: file.name,
          mimeType: mime,
          sizeBytes: file.size,
        });
      }

      onChange(newFiles);
    } catch {
      setLocalError("Terjadi kendala saat mengunggah berkas. Coba lagi.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  function handleRemove(index: number) {
    if (disabled || uploading) return;
    const next = value.filter((_, idx) => idx !== index);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {/* Keterangan Batasan Berkas */}
      <div className="nb-mono text-xs opacity-75">
        Format: <span className="font-bold">{acceptLabels}</span> · Maksimal:{" "}
        <span className="font-bold">{maxSizeMb} MB</span> per berkas (hingga {maxFiles} berkas)
      </div>

      {/* Daftar Berkas yang Berhasil Diunggah */}
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, idx) => (
            <li
              key={file.storagePath}
              className="flex items-center justify-between gap-3 border-2 border-line bg-surface p-2.5 shadow-[2px_2px_0_var(--shadow-color)]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileIcon size={20} className="shrink-0 text-cobalt" />
                <div className="min-w-0 truncate">
                  <p className="truncate text-sm font-bold">{file.originalFilename}</p>
                  <p className="nb-mono text-xs opacity-70">{formatFileSize(file.sizeBytes)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-[#1f883d]">
                  <CheckCircle2 size={16} />
                  <span className="hidden sm:inline">Siap</span>
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    disabled={uploading}
                    title="Hapus berkas ini"
                    aria-label={`Hapus ${file.originalFilename}`}
                    className="nb-btn nb-btn-ghost p-1.5 hover:bg-orange hover:text-ink"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Area Tombol Pilih Berkas */}
      {canUploadMore && (
        <div>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={acceptAttr}
            multiple={maxFiles > 1}
            disabled={disabled || uploading}
            onChange={handleFileSelect}
            className="sr-only"
          />

          <label
            htmlFor={inputId}
            className={`nb-btn flex cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface py-3 text-center font-bold hover:bg-accent hover:text-ink ${
              uploading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{uploadProgress || "Sedang mengunggah…"}</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>{value.length === 0 ? "Pilih Berkas untuk Diunggah" : "Tambah Berkas Lain"}</span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Pesan Kesalahan Lokal */}
      {localError && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-bold text-[color:var(--danger)]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{localError}</span>
        </p>
      )}
    </div>
  );
}

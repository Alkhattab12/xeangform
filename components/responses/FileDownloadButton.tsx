"use client";

import { useState } from "react";
import { Download, File as FileIcon, Loader2 } from "lucide-react";
import { getFileDownloadUrl } from "@/app/actions/upload";
import { formatFileSize } from "@/lib/forms/files";

type Props = {
  formId: string;
  storagePath: string;
  filename: string;
  sizeBytes: number;
};

export function FileDownloadButton({ formId, storagePath, filename, sizeBytes }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await getFileDownloadUrl(formId, storagePath);
      if (res.ok) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        alert(res.error || "Gagal mengunduh berkas.");
      }
    } catch {
      alert("Terjadi kendala saat mengunduh berkas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-2 border-line bg-surface p-3 shadow-[2px_2px_0_var(--shadow-color)]">
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon size={20} className="shrink-0 text-cobalt" />
        <div className="min-w-0 truncate">
          <p className="truncate font-bold text-sm sm:text-base">{filename}</p>
          <p className="nb-mono text-xs opacity-70">{formatFileSize(sizeBytes)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="nb-btn flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-bold hover:bg-accent hover:text-ink"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        <span>{loading ? "Menyiapkan…" : "Unduh"}</span>
      </button>
    </div>
  );
}

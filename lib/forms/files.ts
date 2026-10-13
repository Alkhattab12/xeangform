import { z } from "zod";
import type { FileCategory } from "./schema";

export const uploadedFileSchema = z.object({
  storagePath: z.string().min(1).max(300),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().nonnegative(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

export const CATEGORY_MIME_MAP: Record<FileCategory, string[]> = {
  pdf: ["application/pdf"],
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
  ],
  spreadsheet: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
};

export const CATEGORY_EXT_MAP: Record<FileCategory, string[]> = {
  pdf: [".pdf"],
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"],
  document: [".doc", ".docx", ".txt", ".rtf", ".pdf"],
  spreadsheet: [".xls", ".xlsx", ".csv"],
};

export function getAcceptString(categories: FileCategory[]): string {
  const exts = categories.flatMap((c) => CATEGORY_EXT_MAP[c] ?? []);
  const mimes = categories.flatMap((c) => CATEGORY_MIME_MAP[c] ?? []);
  return [...new Set([...exts, ...mimes])].join(",");
}

export function isAllowedFile(filename: string, mimeType: string, categories: FileCategory[]): boolean {
  if (!categories || categories.length === 0) return true;
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  for (const cat of categories) {
    const allowedExts = CATEGORY_EXT_MAP[cat] ?? [];
    const allowedMimes = CATEGORY_MIME_MAP[cat] ?? [];
    if (allowedExts.includes(ext) || allowedMimes.includes(mimeType.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

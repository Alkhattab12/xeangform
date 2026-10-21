import { NextResponse, type NextRequest } from "next/server";
import { cleanupOrphanFiles } from "@/lib/forms/cleanup-orphans";

export const dynamic = "force-dynamic";

/**
 * Endpoint Vercel Cron Mingguan:
 * Menghapus berkas yatim (orphan files) di bucket submission-files yang tidak terdaftar
 * pada tabel submission_files dan berusia > 24 jam.
 */
export async function GET(request: NextRequest) {
  // Fail-closed: Pastikan CRON_SECRET telah dikonfigurasi di environment
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET belum dikonfigurasi" }, { status: 500 });
  }

  // Verifikasi token rahasia CRON Vercel
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Akses tidak diizinkan." }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  const result = await cleanupOrphanFiles(undefined, { dryRun });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

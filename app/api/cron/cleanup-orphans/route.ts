import { NextResponse, type NextRequest } from "next/server";
import { cleanupOrphanFiles } from "@/lib/forms/cleanup-orphans";

export const dynamic = "force-dynamic";

/**
 * Endpoint Vercel Cron Mingguan:
 * Menghapus berkas yatim (orphan files) di bucket submission-files yang tidak terdaftar
 * pada tabel submission_files dan berusia > 24 jam.
 */
export async function GET(request: NextRequest) {
  // Verifikasi token rahasia CRON jika dikonfigurasi di environment
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Akses tidak diizinkan." }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  const result = await cleanupOrphanFiles(undefined, { dryRun });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

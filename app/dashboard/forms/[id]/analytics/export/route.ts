import { z } from "zod";
import { questionDetail } from "@/lib/analytics/compute";
import { toCsv, type CsvCell } from "@/lib/analytics/csv";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { runAnalytics } from "@/lib/analytics/run";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export const dynamic = "force-dynamic";
const JENIS = ["ringkasan", "kelas", "nilai", "tren", "soal", "opsi", "peserta"] as const;
type Jenis = (typeof JENIS)[number];
const wib = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 19);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Tidak ditemukan", { status: 404 });

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return new Response("Belum masuk", { status: 401 });

  // Otorisasi di server: form harus milik user ini (RLS + filter owner), bukan sekadar menyembunyikan tombol.
  const { data: form } = await supabase.from("forms").select("slug,schema_json,settings_json").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!form) return new Response("Tidak ditemukan", { status: 404 });

  const url = new URL(req.url);
  const jenis = url.searchParams.get("jenis") as Jenis | null;
  if (!jenis || !JENIS.includes(jenis)) return new Response("Jenis ekspor tidak dikenal", { status: 400 });
  const filters = parseAnalyticsFilters(Object.fromEntries(url.searchParams));

  const res = await runAnalytics(supabase, id, form, filters);
  if (!res.ok) return new Response(res.error, { status: 500 });
  const a = res.analytics;
  const s = a.summary;
  const gl = res.groupField?.label.trim() || "Kelompok";

  let headers: string[] = [];
  let rows: CsvCell[][] = [];
  switch (jenis) {
    case "ringkasan":
      headers = ["Metrik", "Nilai"];
      rows = [
        ["Total respons valid", s.responses],
        ["Respons dengan akun", s.identified],
        ["Peserta unik (teridentifikasi)", s.participants],
        ["Percobaan selesai", s.responses],
        ["Soal berkunci", s.keyed],
        ["Total skor diperoleh", s.hasScores ? s.scoreSum : null],
        ["Total skor maksimum", s.hasScores ? s.scoreMax : null],
        ["Akumulasi skor (%)", s.scorePct],
        ["Total benar", s.hasScores ? s.correct : null],
        ["Total salah", s.hasScores ? s.wrong : null],
        ["Total kosong", s.hasScores ? s.blank : null],
        ["Akurasi (%)", s.accuracy],
        ["Rata-rata nilai per percobaan", s.perResponse.mean],
        ["Rata-rata nilai per peserta unik", s.perParticipant.mean],
        ["Median", s.perResponse.median],
        ["Tertinggi", s.perResponse.max],
        ["Terendah", s.perResponse.min],
        ["Simpangan baku (populasi)", s.perResponse.sd],
        [`Kelulusan >= ${filters.pass} (%)`, s.perResponse.passRate],
      ];
      break;
    case "kelas":
      headers = [gl, "Respons valid", "Kontribusi (%)", "Peserta unik", "Pengerjaan selesai", "Rata-rata nilai", "Tertinggi", "Terendah", "Kelulusan (%)"];
      rows = a.classes.map((c) => [c.label, c.responses, c.share, c.participants, c.completed, c.avg, c.max, c.min, c.passRate]);
      break;
    case "nilai":
      headers = ["Rentang nilai", "Jumlah", "Persentase (%)"];
      rows = a.histogram.map((b) => [b.label, b.count, b.pct]);
      break;
    case "tren":
      headers = [`Periode (${filters.interval})`, "Pengerjaan", "Rata-rata nilai"];
      rows = a.trend.map((t) => [t.key, t.n, t.avg]);
      break;
    case "soal":
      headers = ["No", "Soal", "Jenis", "Peserta", "Menjawab", "Tidak menjawab", "Benar", "Salah", "Akurasi (%)", "Tidak dijawab (%)", "Opsi terbanyak", "Pemilih terbanyak", "Indikator", "Sampel terbatas"];
      rows = a.questions.map((q) => [q.no, q.label, q.type, q.respondents, q.answered, q.blank, q.correct, q.wrong, q.pctCorrect, q.pctBlank, q.topLabel, q.topCount, q.difficulty ?? "", q.limited ? "Ya" : "Tidak"]);
      break;
    case "opsi":
      headers = ["No soal", "Soal", "Pilihan / jawaban", "Pemilih", "Persentase dari yang menjawab (%)", "Status kunci"];
      for (const q of a.questions) {
        const d = questionDetail(res.rows, res.fields, q.id, filters);
        if (!d) continue;
        for (const o of d.options) rows.push([q.no, q.label, o.label, o.count, o.pct, o.correct === true ? "Benar" : o.correct === false ? "Salah" : ""]);
        rows.push([q.no, q.label, "(Tidak dijawab)", d.blank, q.pctBlank, "Kosong"]);
      }
      break;
    case "peserta":
      headers = ["ID respons", "Waktu kirim (WIB)", "Peserta", gl, "Nilai", "Benar", "Salah", "Kosong"];
      rows = res.rows.map((r) => [r.id, wib(r.at), r.who, r.groupLabel, r.pct, res.keyed > 0 ? r.correct : null, res.keyed > 0 ? r.wrong : null, res.keyed > 0 ? r.blank : null]);
      break;
  }

  const stamp = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analitik-${jenis}-${form.slug as string}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

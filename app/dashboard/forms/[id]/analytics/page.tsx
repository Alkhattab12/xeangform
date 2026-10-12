import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClassSection } from "@/components/analytics/ClassSection";
import { DataTable, type TableRow } from "@/components/analytics/DataTable";
import { fmtDelta, fmtInt, fmtNum, fmtPct } from "@/components/analytics/format";
import { QuestionSection } from "@/components/analytics/QuestionSection";
import { ScoreSection } from "@/components/analytics/ScoreSection";
import { StatCard } from "@/components/analytics/StatCard";
import { changes, groupCandidates, questionDetail } from "@/lib/analytics/compute";
import { describeFilters, filtersToQs, parseAnalyticsFilters, DEFAULT_BINS } from "@/lib/analytics/filters";
import { ANALYTICS_CAP } from "@/lib/analytics/load";
import { runAnalytics } from "@/lib/analytics/run";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analitik" };
export const dynamic = "force-dynamic";

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const wibStamp = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 16);
const EXPORTS = [
  { jenis: "ringkasan", label: "Ringkasan" },
  { jenis: "kelas", label: "Distribusi per kelompok" },
  { jenis: "nilai", label: "Distribusi nilai" },
  { jenis: "tren", label: "Tren nilai" },
  { jenis: "soal", label: "Statistik per soal" },
  { jenis: "opsi", label: "Distribusi pilihan jawaban" },
  { jenis: "peserta", label: "Data peserta" },
];

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const filters = parseAnalyticsFilters(await searchParams);

  const supabase = await createClient();
  // RLS: hanya form milik user yang terbaca; respons juga dibatasi RLS yang sama.
  const { data: form } = await supabase.from("forms").select("title,status,schema_json,settings_json").eq("id", id).maybeSingle();
  if (!form) notFound();

  const [res, quizzes] = await Promise.all([
    runAnalytics(supabase, id, form, filters),
    supabase.from("forms").select("id", { count: "exact", head: true }).eq("settings_json->>quiz", "true"),
  ]);

  const base = `/dashboard/forms/${id}/analytics`;
  const qs = filtersToQs(filters);
  const back = (
    <nav aria-label="Navigasi halaman" className="nb-mono flex flex-wrap gap-4">
      <Link href="/dashboard" className="underline underline-offset-4">← Dashboard</Link>
      <Link href={`/dashboard/forms/${id}/responses`} className="underline underline-offset-4">Respons</Link>
      <Link href={`/dashboard/forms/${id}`} className="underline underline-offset-4">Editor form</Link>
    </nav>
  );

  if (!res.ok) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10">
        {back}
        <h1 className="mt-6 break-words font-display text-[clamp(2rem,6vw,3.5rem)] font-bold">{form.title as string}</h1>
        <div role="alert" className="nb-panel mt-6 border-[3px] bg-orange p-4 font-bold text-ink">{res.error}</div>
      </main>
    );
  }

  const { analytics: a, groupField, keyed, rows } = res;
  const s = a.summary;
  const groupLabel = groupField ? groupField.label.trim() || "Kelompok" : "Kelompok";
  const active = describeFilters(filters, groupField ? groupLabel : null);
  const inputsList = a.questions;
  const selectedId = inputsList.find((q) => q.id === filters.soal)?.id ?? inputsList.find((q) => q.keyed)?.id ?? inputsList[0]?.id ?? "";
  const detail = selectedId ? questionDetail(rows, res.fields, selectedId, filters) : null;
  const selIdx = inputsList.findIndex((q) => q.id === selectedId);
  const soalHref = (qid: string) => `${base}?${filtersToQs({ ...filters, soal: qid })}#detail-soal`;

  const qRows: TableRow[] = a.questions.map((q) => ({
    id: q.id,
    no: q.no,
    label: trunc(q.label, 90),
    respondents: q.respondents,
    answered: q.answered,
    blank: q.blank,
    correct: q.correct,
    wrong: q.wrong,
    pctCorrect: q.pctCorrect,
    top: q.topLabel ? `${trunc(q.topLabel, 30)} (${q.topCount})` : null,
    difficulty: q.difficulty ? `${q.difficulty[0].toUpperCase()}${q.difficulty.slice(1)}${q.limited ? " · sampel terbatas" : ""}` : q.keyed ? null : "Tanpa kunci",
    low: q.keyed && q.pctCorrect !== null && q.pctCorrect < filters.hard ? 1 : 0,
    blankHigh: q.pctBlank !== null && q.pctBlank >= 20 ? 1 : 0,
    review: q.review ? 1 : 0,
    href: soalHref(q.id),
  }));

  const pRows: TableRow[] = a.participants.map((p) => ({
    id: p.id,
    at: wibStamp(p.at),
    who: p.who || "Anonim",
    group: p.group,
    pct: p.pct,
    correct: s.hasScores ? p.correct : null,
    wrong: s.hasScores ? p.wrong : null,
    blank: s.hasScores ? p.blank : null,
    attempt: p.who ? p.attempt : null,
    href: `/dashboard/forms/${id}/responses/${p.id}`,
  }));

  const change = res.prevRange && res.prevSummary ? changes(s, res.prevSummary) : null;
  const hidden = [...new URLSearchParams(filtersToQs(filters, ["soal"])).entries()];
  const fieldCls = "mb-1 block font-display text-sm font-bold";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {back}
      <p className="nb-mono mt-6">Analitik / {form.status === "published" ? "Terbit" : form.status === "archived" ? "Arsip" : "Draft"}</p>
      <h1 className="mt-2 break-words font-display text-[clamp(2rem,6vw,3.5rem)] font-bold">{form.title as string}</h1>
      <p className="mt-2 max-w-3xl opacity-80">
        Ringkasan hasil dihitung langsung dari respons yang tersimpan, dengan kunci jawaban form saat ini.
        {res.span ? ` Data aktif: ${res.span.from} s.d. ${res.span.to} (WIB).` : " Belum ada respons dalam cakupan ini."}
      </p>

      {/* Filter */}
      <form method="get" action={base} className="nb-panel nb-panel-strong mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {filters.soal && <input type="hidden" name="soal" value={filters.soal} />}
        <div>
          <label htmlFor="from" className={fieldCls}>Dari tanggal</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="nb-input" />
        </div>
        <div>
          <label htmlFor="to" className={fieldCls}>Sampai tanggal</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="nb-input" />
        </div>
        <div>
          <label htmlFor="group" className={fieldCls}>Kelompokkan berdasarkan</label>
          <select id="group" name="group" defaultValue={filters.group} className="nb-input">
            <option value="">Otomatis{groupField ? ` (${trunc(groupField.label, 24)})` : " (tidak ditemukan)"}</option>
            {groupCandidates(res.fields).map((f) => (
              <option key={f.id} value={f.id}>{trunc(f.label || "(tanpa judul)", 40)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="kelas" className={fieldCls}>{groupField ? groupLabel : "Kelompok"}</label>
          <select id="kelas" name="kelas" defaultValue={filters.cls} className="nb-input" disabled={!groupField}>
            <option value="">Semua</option>
            {res.groupOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="percobaan" className={fieldCls}>Percobaan</label>
          <select id="percobaan" name="percobaan" defaultValue={filters.attempt} className="nb-input">
            <option value="semua">Semua percobaan</option>
            <option value="pertama">Percobaan pertama</option>
            <option value="terakhir">Percobaan terakhir</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className={fieldCls}>Status respons</label>
          <select id="status" name="status" defaultValue={filters.status} className="nb-input">
            <option value="valid">Valid (tanpa spam)</option>
            <option value="received">Diterima saja</option>
            <option value="flagged">Ditandai saja</option>
            <option value="spam">Spam saja</option>
          </select>
        </div>
        <div>
          <label htmlFor="peserta" className={fieldCls}>Peserta tertentu</label>
          <input id="peserta" name="peserta" type="search" defaultValue={filters.person} maxLength={100} placeholder="nama atau email" className="nb-input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="smin" className={fieldCls}>Nilai min</label>
            <input id="smin" name="smin" type="number" min={0} max={100} defaultValue={filters.smin ?? ""} className="nb-input" />
          </div>
          <div>
            <label htmlFor="smax" className={fieldCls}>Nilai maks</label>
            <input id="smax" name="smax" type="number" min={0} max={100} defaultValue={filters.smax ?? ""} className="nb-input" />
          </div>
        </div>
        <div>
          <label htmlFor="lulus" className={fieldCls}>Nilai kelulusan (KKM)</label>
          <input id="lulus" name="lulus" type="number" min={0} max={100} defaultValue={filters.pass} className="nb-input" />
        </div>
        <div>
          <label htmlFor="interval" className={fieldCls}>Interval tren</label>
          <select id="interval" name="interval" defaultValue={filters.interval} className="nb-input">
            <option value="hari">Per hari</option>
            <option value="minggu">Per minggu</option>
            <option value="bulan">Per bulan</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="sulit" className={fieldCls}>Sulit di bawah (%)</label>
            <input id="sulit" name="sulit" type="number" min={1} max={99} defaultValue={filters.hard} className="nb-input" />
          </div>
          <div>
            <label htmlFor="mudah" className={fieldCls}>Mudah mulai (%)</label>
            <input id="mudah" name="mudah" type="number" min={2} max={100} defaultValue={filters.easy} className="nb-input" />
          </div>
        </div>
        <div>
          <label htmlFor="bins" className={fieldCls}>Rentang histogram</label>
          <input id="bins" name="bins" type="text" defaultValue={filters.bins.join(",")} pattern="[0-9,\s]*" className="nb-input" aria-describedby="bins-hint" />
          <p id="bins-hint" className="nb-mono mt-1">Batas naik dari 0 sampai 100. Bawaan: {DEFAULT_BINS.join(",")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="nb-btn">Terapkan</button>
          <Link href={base} className="nb-btn nb-btn-ghost">Reset semua filter</Link>
          <span className="nb-mono">Tanggal memakai zona WIB. Semua kartu, grafik, tabel, dan ekspor memakai filter yang sama.</span>
        </div>
      </form>

      <div className="mt-4" aria-live="polite">
        <p className="nb-mono">Cakupan aktif:</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          <li className="border-2 border-line bg-accent px-2 py-0.5 text-sm font-bold text-ink">{fmtInt(s.responses)} respons</li>
          {active.length === 0 ? (
            <li className="border-2 border-line px-2 py-0.5 text-sm">Tanpa filter tambahan</li>
          ) : (
            active.map((x) => (
              <li key={x} className="border-2 border-line px-2 py-0.5 text-sm">{x}</li>
            ))
          )}
        </ul>
      </div>

      {res.capped && (
        <p role="status" className="nb-panel mt-4 bg-lavender p-3 text-sm font-bold text-ink">
          Form ini punya {fmtInt(res.total)} respons dalam rentang tanggal; analitik memakai {fmtInt(res.loaded)} respons terbaru (batas {fmtInt(ANALYTICS_CAP)}). Persempit rentang tanggal untuk cakupan penuh.
        </p>
      )}
      {!res.hasRespondentColumn && (
        <p role="status" className="nb-panel mt-4 bg-lavender p-3 text-sm font-bold text-ink">
          Kolom respondent_id belum ada di database ini (migrasi 0004 belum dijalankan). Peserta unik hanya dihitung dari email akun yang tercatat.
        </p>
      )}

      {/* Kartu ringkasan */}
      <section aria-label="Ringkasan akumulasi" className="mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total respons" value={fmtInt(s.responses)} tone="bg-accent text-ink" hint="Pengiriman jawaban yang valid dalam filter aktif." />
          <StatCard label="Peserta unik" value={s.identified > 0 ? fmtInt(s.participants) : "Belum ada data"} hint={s.identified > 0 ? `Dari ${fmtInt(s.identified)} respons yang punya akun. Respons anonim tidak dihitung unik.` : "Form ini tidak mewajibkan login, jadi peserta tidak bisa dibedakan."} />
          <StatCard label="Percobaan selesai" value={fmtInt(s.responses)} hint="Satu respons = satu percobaan selesai. Pengerjaan yang belum dikirim tidak tersimpan, jadi tidak ada hitungan “berlangsung”." />
          <StatCard label="Kuis tersedia" value={quizzes.error ? "—" : fmtInt(quizzes.count ?? 0)} hint="Jumlah form mode kuis milikmu (semua status)." />
        </div>

        {s.hasScores ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Akumulasi skor" value={s.scoreMax > 0 ? `${fmtInt(s.scoreSum)} / ${fmtInt(s.scoreMax)}` : "Belum ada data"} lines={[`Persentase: ${fmtPct(s.scorePct)}`, `Benar ${fmtInt(s.correct)} · Salah ${fmtInt(s.wrong)} · Kosong ${fmtInt(s.blank)}`]} hint={`Semua soal berbobot sama (${fmtInt(keyed)} soal berkunci).`} />
            <StatCard
              label="Rata-rata nilai"
              value={s.perResponse.mean === null ? "Belum ada data" : fmtNum(s.perResponse.mean)}
              lines={[
                `Per percobaan (${fmtInt(s.perResponse.n)} pengerjaan)`,
                `Per peserta unik: ${s.perParticipant.n > 0 ? `${fmtNum(s.perParticipant.mean)} (${fmtInt(s.perParticipant.n)} peserta)` : "Belum ada data"}`,
                `Median ${fmtNum(s.perResponse.median)} · Tertinggi ${fmtNum(s.perResponse.max)} · Terendah ${fmtNum(s.perResponse.min)}`,
                `Simpangan baku ${fmtNum(s.perResponse.sd)}`,
              ]}
              hint="Skala 0–100. Soal kosong dihitung 0 pada nilai, tetapi tidak pada akurasi."
            />
            <StatCard
              label={`Kelulusan (≥ ${filters.pass})`}
              value={fmtPct(s.perResponse.passRate)}
              lines={s.perResponse.passRate === null ? [] : [`Lulus ${fmtInt(s.perResponse.passed)} · Belum ${fmtInt(s.perResponse.n - s.perResponse.passed)}`, `Belum mencapai: ${fmtPct(100 - s.perResponse.passRate)}`]}
              hint="Dihitung dari pengerjaan bernilai, bukan dari peserta unik."
            />
            <StatCard label="Akurasi jawaban" value={fmtPct(s.accuracy)} hint="Benar ÷ (benar + salah). Soal kosong tidak masuk penyebut." />
            <StatCard label="Soal dijawab" value={s.scoreMax > 0 ? fmtPct(((s.correct + s.wrong) / s.scoreMax) * 100) : "Belum ada data"} lines={s.scoreMax > 0 ? [`Tidak dijawab: ${fmtPct((s.blank / s.scoreMax) * 100)}`] : []} hint="Dari seluruh soal berkunci × pengerjaan." />
          </div>
        ) : (
          <p className="nb-panel nb-panel-strong mt-4 p-4">
            <strong>Form ini belum punya soal berkunci jawaban.</strong> Kartu nilai, akurasi, dan kelulusan disembunyikan agar tidak menampilkan 0 yang menyesatkan. Distribusi respons dan jawaban tetap tersedia di bawah.
          </p>
        )}

        {/* Indikator perubahan */}
        <div className="nb-panel nb-panel-strong mt-4 p-4">
          <h2 className="font-display text-xl font-bold">Perubahan dibanding periode sebelumnya</h2>
          {!res.prevRange || !change ? (
            <p className="mt-2 text-sm">Isi “Dari tanggal” dan “Sampai tanggal” untuk membandingkan dengan periode sebelumnya yang sama panjangnya.</p>
          ) : !change.enough ? (
            <p className="mt-2 text-sm">
              Periode pembanding ({res.prevRange.from} s.d. {res.prevRange.to}) hanya punya {fmtInt(res.prevSummary?.responses ?? 0)} respons. Belum memadai untuk indikator perubahan (minimal 5).
            </p>
          ) : (
            <>
              <p className="nb-mono mt-1">Pembanding: {res.prevRange.from} s.d. {res.prevRange.to}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {change.items.map((c) => (
                  <li key={c.label} className="border-2 border-line p-3">
                    <p className="nb-mono">{c.label}</p>
                    <p className="mt-1 font-display text-xl font-bold">{fmtDelta(c.delta, c.unit)}</p>
                    <p className="text-sm">Sekarang {c.unit === "persen" && c.label.startsWith("Jumlah") ? fmtInt(c.current) : fmtNum(c.current)} · sebelumnya {c.unit === "persen" && c.label.startsWith("Jumlah") ? fmtInt(c.previous) : fmtNum(c.previous)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {groupField ? (
        <ClassSection classes={a.classes} groupLabel={groupLabel} total={s.responses} />
      ) : (
        <p className="nb-panel nb-panel-strong mt-12 p-4">
          Form ini tidak punya kolom “Kelas” (pilihan, dropdown, atau jawaban singkat). Pilih kolom pengelompok di filter “Kelompokkan berdasarkan” untuk melihat distribusi dan perbandingan per kelompok.
        </p>
      )}

      {s.hasScores && (
        <ScoreSection classes={groupField ? a.classes : []} histogram={a.histogram} trend={a.trend} trendFilled={a.trendFilled} interval={filters.interval} pass={filters.pass} groupLabel={groupLabel} scoredCount={s.perResponse.n} />
      )}

      <QuestionSection
        rows={qRows}
        detail={detail}
        groupLabel={groupField ? groupLabel : null}
        prevHref={selIdx > 0 ? soalHref(inputsList[selIdx - 1].id) : null}
        nextHref={selIdx >= 0 && selIdx < inputsList.length - 1 ? soalHref(inputsList[selIdx + 1].id) : null}
        hard={filters.hard}
        easy={filters.easy}
        selector={
          <form method="get" action={`${base}#detail-soal`} className="flex flex-wrap items-end gap-3">
            {hidden.map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="soal" className={fieldCls}>Pilih soal</label>
              <select id="soal" name="soal" defaultValue={selectedId} className="nb-input">
                {inputsList.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.no}. {trunc(q.label, 70)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="nb-btn min-h-10 px-3 py-2 text-sm">Tampilkan</button>
          </form>
        }
      />

      {/* Individual */}
      <section aria-labelledby="sec-peserta" className="mt-12">
        <h2 id="sec-peserta" className="font-display text-3xl font-bold">Hasil per pengerjaan</h2>
        <p className="mt-1 text-sm opacity-80">
          Setiap baris adalah satu pengerjaan. Peserta yang mengulang muncul beberapa kali (kolom “Ke-”); gunakan filter “Percobaan” agar rata-rata tidak bercampur. Menampilkan hingga 500 pengerjaan terbaru dalam filter.
        </p>
        <div className="mt-3">
          <DataTable
            caption="Daftar pengerjaan"
            pageSize={10}
            searchKeys={["who", "group"]}
            searchLabel="Cari nama atau kelompok"
            defaultSort={{ key: "at", dir: "desc" }}
            columns={[
              { key: "at", label: "Waktu (WIB)" },
              { key: "who", label: "Peserta" },
              { key: "group", label: groupField ? groupLabel : "Kelompok" },
              { key: "pct", label: "Nilai", kind: "dec", align: "right" },
              { key: "correct", label: "Benar", kind: "int", align: "right" },
              { key: "wrong", label: "Salah", kind: "int", align: "right" },
              { key: "blank", label: "Kosong", kind: "int", align: "right" },
              { key: "attempt", label: "Ke-", kind: "int", align: "right" },
              { key: "href", label: "Detail", kind: "link", linkLabel: "Buka" },
            ]}
            rows={pRows}
            empty="Belum ada pengerjaan dalam filter ini."
          />
        </div>
      </section>

      {/* Ekspor */}
      <section aria-labelledby="sec-ekspor" className="mt-12">
        <h2 id="sec-ekspor" className="font-display text-3xl font-bold">Ekspor CSV</h2>
        <p className="mt-1 text-sm opacity-80">Mengikuti filter yang sedang aktif. Ekspor Excel dan PDF belum tersedia.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <a key={e.jenis} href={`${base}/export?jenis=${e.jenis}${qs ? `&${qs}` : ""}`} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">
              {e.label}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-label="Definisi dan metode">
        <details className="nb-panel nb-panel-strong p-4">
          <summary className="cursor-pointer font-display text-xl font-bold">Definisi metrik dan metode perhitungan</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li><strong>Respons / percobaan selesai:</strong> satu baris respons tersimpan. Spam dikeluarkan secara bawaan.</li>
            <li><strong>Peserta unik:</strong> akun (respondent_id) atau email akun yang sama. Respons anonim tidak bisa dibedakan, jadi tidak ikut hitungan unik.</li>
            <li><strong>Nilai:</strong> benar ÷ jumlah soal berkunci × 100 untuk tiap pengerjaan. Soal kosong menyumbang 0, sama seperti saat peserta mengirim. Semua soal berbobot sama; skor parsial belum didukung.</li>
            <li><strong>Rata-rata:</strong> “per percobaan” memberi bobot sama pada tiap pengerjaan; “per peserta unik” merata-ratakan nilai tiap peserta lebih dulu. Gabungan antar kelompok dihitung ulang dari data mentah, bukan rata-rata dari rata-rata.</li>
            <li><strong>Akurasi:</strong> benar ÷ (benar + salah). Jika penyebut 0 ditampilkan “Belum ada data”.</li>
            <li><strong>Kesulitan soal:</strong> persen peserta yang menjawab benar. Sulit &lt; {filters.hard}%, sedang {filters.hard}–{filters.easy - 1}%, mudah ≥ {filters.easy}%. Sampel &lt; 10 peserta ditandai terbatas.</li>
            <li><strong>Simpangan baku:</strong> populasi (dibagi n).</li>
            <li><strong>Nilai dihitung ulang</strong> dari kunci jawaban form saat ini; jika kunci diubah setelah peserta mengirim, nilai di dashboard mengikuti kunci terbaru.</li>
            <li><strong>Pembatasan:</strong> maksimal {fmtInt(ANALYTICS_CAP)} respons terbaru per tampilan. Perhitungan dilakukan di server; browser hanya menerima angka agregat dan tabel yang ditampilkan.</li>
          </ul>
        </details>
      </section>
    </main>
  );
}

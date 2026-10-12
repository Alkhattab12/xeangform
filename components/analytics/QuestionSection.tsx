"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QuestionDetail } from "@/lib/analytics/compute";
import { FIELD_META } from "@/lib/forms/field-meta";
import type { FieldType } from "@/lib/forms/schema";
import { AccumulationChart, type AccItem } from "./AccumulationChart";
import { DataTable, type TableRow } from "./DataTable";
import { COLOR_BAD, COLOR_BLANK, COLOR_OK, fmtInt, fmtNum, fmtPct } from "./format";
import { useReducedMotion } from "./useReducedMotion";

const tick = { fill: "var(--fg)", fontSize: 12 };
const tipBox = "border-2 border-line bg-surface p-2 text-sm text-fg shadow-[3px_3px_0_var(--shadow-color)]";
const typeLabel = (t: string) => FIELD_META[t as FieldType]?.label ?? t;

const trunc = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Props = {
  rows: TableRow[];
  detail: QuestionDetail | null;
  groupLabel: string | null;
  prevHref: string | null;
  nextHref: string | null;
  hard: number;
  easy: number;
  /** Pilihan soal untuk selector (server-render, tanpa JS). */
  selector: React.ReactNode;
};

export function QuestionSection({ rows, detail, groupLabel, prevHref, nextHref, hard, easy, selector }: Props) {
  const reduced = useReducedMotion();
  const anim = { isAnimationActive: !reduced, animationDuration: 450 };

  const accItems: AccItem[] = detail
    ? [
        ...detail.options.map((o): AccItem => ({
          key: o.id,
          label: `${o.correct === true ? "✓ " : o.correct === false ? "✗ " : ""}${trunc(o.label)}`,
          value: o.count,
          pct: detail.row.respondents > 0 ? (o.count / detail.row.respondents) * 100 : null,
          fill: o.correct === true ? COLOR_OK : o.correct === false ? COLOR_BAD : undefined,
          status: o.correct === true ? "✓ Benar" : o.correct === false ? "✗ Salah" : undefined,
        })),
        { key: "_blank", label: "– Tidak dijawab", value: detail.blank, pct: detail.row.pctBlank, fill: COLOR_BLANK, status: detail.row.keyed ? "Kosong" : undefined },
      ]
    : [];
  const d = detail?.row;
  const diffText = d?.difficulty ? { sulit: `Sulit (< ${hard}% benar)`, sedang: `Sedang (${hard}–${easy - 1}% benar)`, mudah: `Mudah (≥ ${easy}% benar)` }[d.difficulty] : null;
  const classOptions = detail ? detail.options.filter((o) => o.count > 0 || detail.byClass.some((c) => (c.counts[o.id] ?? 0) > 0)) : [];

  return (
    <section aria-labelledby="sec-soal" className="mt-12">
      <h2 id="sec-soal" className="font-display text-3xl font-bold">Analisis jawaban per soal</h2>
      <p className="mt-1 text-sm opacity-80">
        Tingkat kesulitan memakai persentase peserta yang menjawab benar pada data yang diamati; ini bukan ukuran mutlak kualitas soal. Ambang batas bisa diubah di filter.
      </p>

      <div id="detail-soal" className="nb-panel nb-panel-strong mt-4 scroll-mt-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">{selector}</div>
          <div className="flex gap-2">
            {prevHref ? <a href={prevHref} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">← Soal sebelumnya</a> : null}
            {nextHref ? <a href={nextHref} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">Soal berikutnya →</a> : null}
          </div>
        </div>

        {!detail || !d ? (
          <p className="mt-4 font-bold">Belum ada soal untuk dianalisis.</p>
        ) : (
          <div className="mt-5">
            <p className="nb-mono">
              Soal {d.no} · {typeLabel(d.type)}
              {d.keyed ? " · Berkunci" : " · Tanpa kunci jawaban"}
            </p>
            <h3 className="mt-1 break-words font-display text-2xl font-bold">{d.label}</h3>

            {d.respondents === 0 ? (
              <p className="nb-panel mt-4 p-4 font-bold">Belum ada respons untuk soal ini dalam filter aktif.</p>
            ) : (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fact label="Peserta" value={fmtInt(d.respondents)} />
                  <Fact label="Menjawab" value={fmtInt(d.answered)} />
                  <Fact label="Tidak menjawab" value={`${fmtInt(d.blank)} (${fmtPct(d.pctBlank, "–")})`} />
                  {d.keyed ? <Fact label="Benar" value={`${fmtInt(d.correct)} (${fmtPct(d.pctCorrect, "–")})`} /> : <Fact label="Rata-rata" value={fmtNum(detail.mean)} />}
                  {d.keyed && <Fact label="Salah" value={`${fmtInt(d.wrong)} (${fmtPct(d.pctWrong, "–")})`} />}
                  {diffText && <Fact label="Tingkat kesulitan" value={diffText} />}
                </dl>
                {d.limited && <p className="nb-panel mt-3 bg-lavender p-3 text-sm font-bold text-ink">Sampel terbatas ({d.respondents} peserta). Jangan menarik kesimpulan kuat dari angka ini.</p>}

                <div className="mt-5">
                  <h4 className="font-display text-lg font-bold">Akumulasi jawaban soal ini</h4>
                  <p className="nb-mono mt-1 mb-2">
                    Persentase dihitung dari {fmtInt(d.respondents)} peserta{d.type === "checkbox" ? " (pilihan ganda: total bisa melebihi 100%)" : ""}. ✓ benar · ✗ salah.
                  </p>
                  <AccumulationChart key={d.id} name={`jawaban soal ${d.no}`} items={accItems} valueLabel="Pemilih" rowLabel="Pilihan / jawaban" pctLabel="Dari peserta" note={detail.note ?? undefined} />
                </div>

                {d.topLabel && (
                  <div className="nb-panel mt-5 p-4">
                    <h4 className="font-display text-lg font-bold">Jawaban terbanyak</h4>
                    <p className="mt-1">
                      “{d.topLabel}” dipilih {fmtInt(d.topCount)} peserta ({fmtPct(d.topPct, "–")})
                      {d.topCorrect === true ? " — jawaban benar" : d.topCorrect === false ? " — jawaban salah" : ""}
                      {detail.gap !== null ? `; selisih ${fmtInt(detail.gap)} peserta dengan pilihan terbanyak berikutnya.` : "."}
                    </p>
                    {d.review && (
                      <p className="mt-2 font-bold">
                        ⚠ Perlu ditinjau: pilihan terbanyak adalah jawaban salah. Ini sinyal untuk memeriksa soal atau materi, bukan bukti bahwa soal salah atau ambigu.
                      </p>
                    )}
                  </div>
                )}

                {detail.byClass.length > 0 && groupLabel && (d.keyed || classOptions.length > 0) && (
                  <div className="mt-6">
                    <h4 className="font-display text-lg font-bold">Perbandingan antar {groupLabel.toLowerCase()}</h4>
                    <p className="nb-mono mt-1">Persentase dihitung dari peserta di tiap kelompok yang menjawab soal ini, bukan dari seluruh peserta. Kelompok kecil (n &lt; 5) kurang andal.</p>
                    {d.keyed ? (
                      <div role="img" aria-label={`Diagram batang persentase benar soal ${d.no} per ${groupLabel.toLowerCase()}. Rincian ada pada tabel.`} className="mt-2" style={{ height: Math.max(180, detail.byClass.length * 40 + 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={detail.byClass} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={tick} />
                            <YAxis type="category" dataKey="label" tick={tick} width={92} interval={0} />
                            <Tooltip
                              cursor={{ fill: "rgba(128,128,128,0.15)" }}
                              content={({ active, payload }) => {
                                const c = active ? (payload?.[0]?.payload as QuestionDetail["byClass"][number] | undefined) : undefined;
                                if (!c) return null;
                                return (
                                  <div className={tipBox}>
                                    <p className="font-display font-bold">{c.label}</p>
                                    <p>Benar: {fmtPct(c.pct, "Belum ada data")}</p>
                                    <p>Dasar: {fmtInt(c.n)} peserta menjawab</p>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="pct" fill={COLOR_OK} stroke="var(--line)" strokeWidth={2} {...anim}>
                              <LabelList dataKey="pct" position="right" fill="var(--fg)" fontSize={12} formatter={(v: unknown) => (typeof v === "number" ? `${Math.round(v)}%` : "")} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <DataTable
                        caption={`Perbandingan soal ${d.no} antar ${groupLabel.toLowerCase()}`}
                        pageSize={10}
                        columns={[
                          { key: "label", label: groupLabel },
                          { key: "n", label: "Menjawab (n)", kind: "int", align: "right" },
                          ...(d.keyed ? [{ key: "pct", label: "% benar", kind: "pct" as const, align: "right" as const }] : []),
                          ...classOptions.slice(0, 8).map((o, i) => ({ key: `o${i}`, label: `% ${trunc(o.label, 14)}`, kind: "pct" as const, align: "right" as const })),
                        ]}
                        rows={detail.byClass.map((c) => {
                          const r: TableRow = { id: c.key || "_", label: c.label + (c.n < 5 ? " (n kecil)" : ""), n: c.n, pct: c.pct };
                          classOptions.slice(0, 8).forEach((o, i) => {
                            r[`o${i}`] = c.n > 0 ? ((c.counts[o.id] ?? 0) / c.n) * 100 : null;
                          });
                          return r;
                        })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <h3 className="mb-2 mt-8 font-display text-2xl font-bold">Tabel analitik semua soal</h3>
      <DataTable
        caption="Ringkasan statistik setiap soal"
        pageSize={10}
        searchKeys={["no", "label"]}
        searchLabel="Cari nomor atau teks soal"
        defaultSort={{ key: "no", dir: "asc" }}
        chips={[
          { label: `Akurasi rendah (< ${hard}%)`, flag: "low" },
          { label: "Banyak tidak menjawab (≥ 20%)", flag: "blankHigh" },
          { label: "Perlu ditinjau", flag: "review" },
        ]}
        columns={[
          { key: "no", label: "No", kind: "int", align: "right" },
          { key: "label", label: "Ringkasan soal" },
          { key: "respondents", label: "Peserta", kind: "int", align: "right" },
          { key: "answered", label: "Menjawab", kind: "int", align: "right" },
          { key: "blank", label: "Tidak menjawab", kind: "int", align: "right" },
          { key: "correct", label: "Benar", kind: "int", align: "right" },
          { key: "wrong", label: "Salah", kind: "int", align: "right" },
          { key: "pctCorrect", label: "Akurasi", kind: "pct", align: "right" },
          { key: "top", label: "Opsi terbanyak" },
          { key: "difficulty", label: "Indikator", kind: "badge" },
          { key: "href", label: "Detail", kind: "link", linkLabel: "Lihat detail" },
        ]}
        rows={rows}
        empty="Form ini belum punya soal."
      />
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-line p-3">
      <dt className="nb-mono">{label}</dt>
      <dd className="mt-1 font-display text-lg font-bold">{value}</dd>
    </div>
  );
}

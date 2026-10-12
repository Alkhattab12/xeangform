"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bin, ClassRow, TrendPoint } from "@/lib/analytics/compute";
import { DataTable, type TableRow } from "./DataTable";
import { COLOR_NEUTRAL, SERIES, fmtInt, fmtNum, fmtPct } from "./format";
import { useReducedMotion } from "./useReducedMotion";

const tick = { fill: "var(--fg)", fontSize: 12 };
const tipBox = "border-2 border-line bg-surface p-2 text-sm text-fg shadow-[3px_3px_0_var(--shadow-color)]";

type Props = {
  classes: ClassRow[];
  histogram: Bin[];
  trend: TrendPoint[];
  trendFilled: boolean;
  interval: "hari" | "minggu" | "bulan";
  pass: number;
  groupLabel: string;
  scoredCount: number;
};

export function ScoreSection({ classes, histogram, trend, trendFilled, interval, pass, groupLabel, scoredCount }: Props) {
  const reduced = useReducedMotion();
  const anim = { isAnimationActive: !reduced, animationDuration: 450 };
  const avgData = classes.filter((c) => c.avg !== null).map((c, i) => ({ ...c, fill: SERIES[i % SERIES.length] }));
  const rows: TableRow[] = classes.map((c) => ({ id: c.key || "_", label: c.label, avg: c.avg, participants: c.participants, scored: c.scored, max: c.max, min: c.min, passRate: c.passRate }));
  const trendData = trend.map((t) => ({ ...t }));

  return (
    <section aria-labelledby="sec-nilai" className="mt-12">
      <h2 id="sec-nilai" className="font-display text-3xl font-bold">Rata-rata nilai</h2>
      <p className="mt-1 text-sm opacity-80">
        Nilai = jawaban benar ÷ jumlah soal berkunci × 100 per pengerjaan; semua kelompok memakai metode yang sama. {fmtInt(scoredCount)} pengerjaan bernilai masuk perhitungan.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="nb-panel nb-panel-strong p-4">
          <h3 className="font-display text-xl font-bold">Rata-rata per {groupLabel.toLowerCase()}</h3>
          {avgData.length === 0 ? (
            <p className="mt-3 font-bold">Belum ada data.</p>
          ) : (
            <div role="img" aria-label={`Diagram batang rata-rata nilai per ${groupLabel.toLowerCase()}. Garis putus-putus menandai nilai kelulusan ${pass}. Angka lengkap ada pada tabel di bawah.`} className="mt-3" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgData} margin={{ top: 8, right: 8, bottom: avgData.length > 6 ? 36 : 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} />
                  <XAxis dataKey="label" tick={tick} interval={0} angle={avgData.length > 6 ? -35 : 0} textAnchor={avgData.length > 6 ? "end" : "middle"} />
                  <YAxis domain={[0, 100]} tick={tick} width={36} />
                  <ReferenceLine y={pass} stroke="var(--line)" strokeDasharray="6 4" label={{ value: `KKM ${pass}`, fill: "var(--fg)", fontSize: 11, position: "insideTopRight" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(128,128,128,0.15)" }}
                    content={({ active, payload }) => {
                      const d = active ? (payload?.[0]?.payload as ClassRow | undefined) : undefined;
                      if (!d) return null;
                      return (
                        <div className={tipBox}>
                          <p className="font-display font-bold">{d.label}</p>
                          <p>Rata-rata: {fmtNum(d.avg)}</p>
                          <p>Peserta unik: {fmtInt(d.participants)}</p>
                          <p>Pengerjaan dihitung: {fmtInt(d.scored)}</p>
                          <p>Tertinggi / terendah: {fmtNum(d.max)} / {fmtNum(d.min)}</p>
                          <p>Kelulusan: {fmtPct(d.passRate)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avg" stroke="var(--line)" strokeWidth={2} {...anim}>
                    {avgData.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="nb-panel nb-panel-strong p-4">
          <h3 className="font-display text-xl font-bold">Distribusi nilai</h3>
          <div role="img" aria-label="Histogram jumlah pengerjaan per rentang nilai. Angka lengkap ada pada daftar di bawah grafik." className="mt-3" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} />
                <XAxis dataKey="label" tick={tick} interval={0} />
                <YAxis allowDecimals={false} tick={tick} width={36} />
                <Tooltip
                  cursor={{ fill: "rgba(128,128,128,0.15)" }}
                  content={({ active, payload }) => {
                    const d = active ? (payload?.[0]?.payload as Bin | undefined) : undefined;
                    if (!d) return null;
                    return (
                      <div className={tipBox}>
                        <p className="font-display font-bold">Nilai {d.label}</p>
                        <p>Jumlah: {fmtInt(d.count)}</p>
                        <p>Persentase: {fmtPct(d.pct)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill={COLOR_NEUTRAL} stroke="var(--line)" strokeWidth={2} {...anim} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {histogram.map((b) => (
              <li key={b.label}>
                {b.label}: {fmtInt(b.count)} ({fmtPct(b.pct, "—")})
              </li>
            ))}
          </ul>
          <p className="nb-mono mt-2">Rentang bisa diubah lewat parameter “bins” (mis. 0,60,75,90,100).</p>
        </div>
      </div>

      <div className="nb-panel nb-panel-strong mt-6 p-4">
        <h3 className="font-display text-xl font-bold">Tren rata-rata nilai per {interval}</h3>
        {trendData.length === 0 ? (
          <p className="mt-3 font-bold">Belum ada data bernilai pada rentang ini.</p>
        ) : (
          <>
            <div role="img" aria-label={`Grafik garis rata-rata nilai per ${interval}. Periode tanpa data tidak dihubungkan.`} className="mt-3" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} />
                  <XAxis dataKey="label" tick={tick} minTickGap={16} />
                  <YAxis domain={[0, 100]} tick={tick} width={36} />
                  <ReferenceLine y={pass} stroke="var(--line)" strokeDasharray="6 4" />
                  <Tooltip
                    content={({ active, payload }) => {
                      const d = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined;
                      if (!d) return null;
                      return (
                        <div className={tipBox}>
                          <p className="font-display font-bold">{d.label}</p>
                          <p>{d.n === 0 ? "Tidak ada pengerjaan" : `Rata-rata: ${fmtNum(d.avg)}`}</p>
                          <p>Pengerjaan: {fmtInt(d.n)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="avg" stroke={COLOR_NEUTRAL} strokeWidth={3} dot={{ r: 4, stroke: "var(--line)", strokeWidth: 2, fill: "#d7ff38" }} connectNulls={false} {...anim} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="nb-mono mt-2">
              Garis putus-putus = nilai kelulusan ({pass}).{trendFilled ? " Periode tanpa pengerjaan dibiarkan kosong (garis terputus), bukan dianggap 0." : " Terlalu banyak periode, hanya periode yang punya data yang ditampilkan."}
            </p>
          </>
        )}
      </div>

      <div className="mt-6">
        <h3 className="mb-2 font-display text-xl font-bold">Rincian per {groupLabel.toLowerCase()}</h3>
        <DataTable
          caption={`Rata-rata nilai per ${groupLabel.toLowerCase()}`}
          pageSize={15}
          defaultSort={{ key: "label", dir: "asc" }}
          columns={[
            { key: "label", label: groupLabel },
            { key: "avg", label: "Rata-rata", kind: "dec", align: "right" },
            { key: "participants", label: "Peserta unik", kind: "int", align: "right" },
            { key: "scored", label: "Pengerjaan dihitung", kind: "int", align: "right" },
            { key: "max", label: "Tertinggi", kind: "dec", align: "right" },
            { key: "min", label: "Terendah", kind: "dec", align: "right" },
            { key: "passRate", label: "Kelulusan", kind: "pct", align: "right" },
          ]}
          rows={rows}
        />
      </div>
    </section>
  );
}

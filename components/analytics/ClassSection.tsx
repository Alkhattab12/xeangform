"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClassRow } from "@/lib/analytics/compute";
import { DataTable, type TableRow } from "./DataTable";
import { SERIES, fmtInt, fmtPct } from "./format";
import { useReducedMotion } from "./useReducedMotion";

type Kind = "donut" | "pie" | "bar" | "hbar" | "tabel";
const KINDS: { key: Kind; label: string }[] = [
  { key: "donut", label: "Donat" },
  { key: "pie", label: "Lingkaran" },
  { key: "bar", label: "Batang" },
  { key: "hbar", label: "Batang horizontal" },
  { key: "tabel", label: "Tabel" },
];

type Datum = ClassRow & { fill: string; name: string };
const tick = { fill: "var(--fg)", fontSize: 12 };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="border-2 border-line bg-surface p-2 text-sm text-fg shadow-[3px_3px_0_var(--shadow-color)]">
      <p className="font-display font-bold">{d.label}</p>
      <p>Respons: {fmtInt(d.responses)}</p>
      <p>Kontribusi: {fmtPct(d.share)}</p>
      <p>Peserta unik: {fmtInt(d.participants)}</p>
    </div>
  );
}

export function ClassSection({ classes, groupLabel, total }: { classes: ClassRow[]; groupLabel: string; total: number }) {
  const [kind, setKind] = useState<Kind>("donut");
  const reduced = useReducedMotion();
  const data: Datum[] = classes.map((c, i) => ({ ...c, name: c.label, fill: SERIES[i % SERIES.length] }));
  const rows: TableRow[] = classes.map((c) => ({ id: c.key || "_", label: c.label, responses: c.responses, share: c.share, participants: c.participants, completed: c.completed }));
  const anim = { isAnimationActive: !reduced, animationDuration: 450 };

  return (
    <section aria-labelledby="sec-kelas" className="mt-12 w-full min-w-0 max-w-full">
      <h2 id="sec-kelas" className="font-display text-3xl font-bold">Akumulasi respons per {groupLabel.toLowerCase()}</h2>
      <p className="mt-1 text-sm opacity-80">
        Persentase = respons kelompok ÷ total respons dalam filter aktif ({fmtInt(total)}). Jumlah respons bukan ukuran prestasi.
      </p>

      {classes.length === 0 ? (
        <p className="nb-panel nb-panel-strong mt-4 p-6 font-bold">Belum ada respons dalam cakupan filter ini.</p>
      ) : (
        <>
          <div role="group" aria-label="Jenis visualisasi" className="mt-4 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)} className={`nb-btn min-h-10 px-3 py-2 text-xs sm:text-sm ${kind === k.key ? "" : "nb-btn-ghost"}`}>
                {k.label}
              </button>
            ))}
          </div>

          {kind !== "tabel" && (
            <div className="nb-panel nb-panel-strong mt-4 p-4 min-w-0 max-w-full overflow-hidden">
              <div role="img" aria-label={`Grafik ${KINDS.find((k) => k.key === kind)?.label} distribusi respons per kelompok. Rincian ada pada daftar di bawahnya.`} style={{ height: kind === "hbar" ? Math.max(220, data.length * 44 + 40) : 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {kind === "pie" || kind === "donut" ? (
                    <PieChart>
                      <Pie data={data} dataKey="responses" nameKey="name" innerRadius={kind === "donut" ? "55%" : 0} outerRadius="85%" stroke="var(--line)" strokeWidth={2} label={({ percent }) => (percent && percent >= 0.06 ? `${Math.round(percent * 100)}%` : "")} labelLine={false} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  ) : kind === "bar" ? (
                    <BarChart data={data} margin={{ top: 8, right: 8, bottom: data.length > 6 ? 36 : 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} />
                      <XAxis dataKey="name" tick={tick} interval={0} angle={data.length > 6 ? -35 : 0} textAnchor={data.length > 6 ? "end" : "middle"} />
                      <YAxis allowDecimals={false} tick={tick} width={36} />
                      <Tooltip content={<Tip />} cursor={{ fill: "rgba(128,128,128,0.15)" }} />
                      <Bar dataKey="responses" stroke="var(--line)" strokeWidth={2} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={tick} />
                      <YAxis type="category" dataKey="name" tick={tick} width={92} interval={0} />
                      <Tooltip content={<Tip />} cursor={{ fill: "rgba(128,128,128,0.15)" }} />
                      <Bar dataKey="responses" stroke="var(--line)" strokeWidth={2} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {data.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-3 w-3 border-2 border-line" style={{ background: d.fill }} />
                    <span>
                      {d.label}: {fmtInt(d.responses)} ({fmtPct(d.share)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`w-full min-w-0 max-w-full ${kind === "tabel" ? "mt-4" : "mt-6"}`}>
            <DataTable
              caption={`Distribusi respons per ${groupLabel.toLowerCase()}`}
              pageSize={15}
              defaultSort={{ key: "label", dir: "asc" }}
              columns={[
                { key: "label", label: groupLabel },
                { key: "responses", label: "Respons valid", kind: "int", align: "right" },
                { key: "share", label: "Kontribusi", kind: "pct", align: "right" },
                { key: "participants", label: "Peserta unik*", kind: "int", align: "right" },
                { key: "completed", label: "Pengerjaan selesai", kind: "int", align: "right" },
              ]}
              rows={rows}
            />
            <p className="nb-mono mt-2 break-words">*Peserta unik hanya dihitung dari respons yang punya akun; respons anonim tidak bisa dibedakan.</p>
          </div>
        </>
      )}
    </section>
  );
}

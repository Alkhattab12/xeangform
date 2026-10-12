"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type Col, type TableRow } from "./DataTable";
import { SERIES, fmtInt, fmtPct } from "./format";
import { useReducedMotion } from "./useReducedMotion";

export type Kind = "donut" | "pie" | "bar" | "hbar" | "tabel";
export const KINDS: { key: Kind; label: string }[] = [
  { key: "donut", label: "Donat" },
  { key: "pie", label: "Lingkaran" },
  { key: "bar", label: "Batang" },
  { key: "hbar", label: "Batang horizontal" },
  { key: "tabel", label: "Tabel" },
];

export type AccItem = {
  key: string;
  label: string;
  value: number;
  pct: number | null;
  fill?: string;
  status?: string;
  lines?: string[];
  cells?: Record<string, string | number | null>;
};

type Datum = AccItem & { fill: string; name: string };
const tick = { fill: "var(--fg)", fontSize: 12 };

function Tip({ active, payload, valueLabel, pctLabel }: { active?: boolean; payload?: { payload: Datum }[]; valueLabel: string; pctLabel: string }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="border-2 border-line bg-surface p-2 text-sm text-fg shadow-[3px_3px_0_var(--shadow-color)]">
      <p className="font-display font-bold">{d.label}</p>
      <p>
        {valueLabel}: {fmtInt(d.value)}
      </p>
      <p>
        {pctLabel}: {fmtPct(d.pct, "—")}
      </p>
      {d.status && <p>Status: {d.status}</p>}
      {d.lines?.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

type Props = {
  /** Nama akumulasi, dipakai untuk label aksesibilitas dan keterangan tabel. */
  name: string;
  items: AccItem[];
  /** Judul kolom jumlah, mis. "Respons" atau "Pemilih". */
  valueLabel: string;
  rowLabel: string;
  pctLabel?: string;
  extraColumns?: Col[];
  defaultKind?: Kind;
  /** Jika diisi, jenis tampilan dikendalikan dari luar (mis. satu pemilih untuk semua kartu). */
  kind?: Kind;
  onKindChange?: (k: Kind) => void;
  compact?: boolean;
  emptyText?: string;
  note?: string;
};

export function AccumulationChart({ name, items, valueLabel, rowLabel, pctLabel = "Persentase", extraColumns = [], defaultKind = "donut", kind: controlled, onKindChange, compact = false, emptyText = "Belum ada data dalam cakupan filter ini.", note }: Props) {
  const [own, setOwn] = useState<Kind>(defaultKind);
  const kind = controlled ?? own;
  const reduced = useReducedMotion();
  const anim = { isAnimationActive: !reduced, animationDuration: 450 };
  const set = (k: Kind) => (onKindChange ? onKindChange(k) : setOwn(k));

  const data: Datum[] = items.map((it, i) => ({ ...it, name: it.label, fill: it.fill ?? SERIES[i % SERIES.length] }));
  const total = data.reduce((a, d) => a + d.value, 0);
  const hasStatus = items.some((i) => i.status);
  const rows: TableRow[] = items.map((it) => ({ id: it.key, label: it.label, value: it.value, pct: it.pct, status: it.status ?? null, ...(it.cells ?? {}) }));
  const label = KINDS.find((k) => k.key === kind)?.label ?? "";
  const rowH = compact ? 34 : 44;

  return (
    <div>
      <div role="group" aria-label={`Jenis visualisasi: ${name}`} className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => set(k.key)} className={`nb-btn min-h-10 px-3 py-2 text-sm ${kind === k.key ? "" : "nb-btn-ghost"}`}>
            {k.label}
          </button>
        ))}
      </div>

      {items.length === 0 || total === 0 ? (
        <p className="nb-panel mt-3 p-4 font-bold">{emptyText}</p>
      ) : (
        <>
          {kind !== "tabel" && (
            <div className="nb-panel nb-panel-strong mt-3 p-3 sm:p-4">
              <div role="img" aria-label={`Grafik ${label.toLowerCase()}: ${name}. Rincian angka ada pada daftar di bawah grafik.`} style={{ height: kind === "hbar" ? Math.max(compact ? 150 : 200, data.length * rowH + 40) : compact ? 240 : 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {kind === "pie" || kind === "donut" ? (
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" innerRadius={kind === "donut" ? "55%" : 0} outerRadius="85%" stroke="var(--line)" strokeWidth={2} label={({ payload }: { payload?: Datum }) => (payload && payload.pct !== null && payload.pct >= 6 ? `${Math.round(payload.pct)}%` : "")} labelLine={false} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<Tip valueLabel={valueLabel} pctLabel={pctLabel} />} />
                    </PieChart>
                  ) : kind === "bar" ? (
                    <BarChart data={data} margin={{ top: 16, right: 8, bottom: data.length > 5 ? 44 : 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} />
                      <XAxis dataKey="name" tick={tick} interval={0} angle={data.length > 5 ? -35 : 0} textAnchor={data.length > 5 ? "end" : "middle"} />
                      <YAxis allowDecimals={false} tick={tick} width={36} />
                      <Tooltip content={<Tip valueLabel={valueLabel} pctLabel={pctLabel} />} cursor={{ fill: "rgba(128,128,128,0.15)" }} />
                      <Bar dataKey="value" stroke="var(--line)" strokeWidth={2} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                        <LabelList dataKey="value" position="top" fill="var(--fg)" fontSize={12} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.25} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={tick} />
                      <YAxis type="category" dataKey="name" tick={tick} width={compact ? 100 : 120} interval={0} />
                      <Tooltip content={<Tip valueLabel={valueLabel} pctLabel={pctLabel} />} cursor={{ fill: "rgba(128,128,128,0.15)" }} />
                      <Bar dataKey="value" stroke="var(--line)" strokeWidth={2} {...anim}>
                        {data.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                        <LabelList dataKey="value" position="right" fill="var(--fg)" fontSize={12} />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {data.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 border-2 border-line" style={{ background: d.fill }} />
                    <span>
                      {d.label}: {fmtInt(d.value)} ({fmtPct(d.pct, "—")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {kind === "tabel" && (
            <div className="mt-3">
              <DataTable
                caption={`Akumulasi: ${name}`}
                pageSize={compact ? 8 : 15}
                columns={[
                  { key: "label", label: rowLabel },
                  { key: "value", label: valueLabel, kind: "int", align: "right" },
                  { key: "pct", label: pctLabel, kind: "pct", align: "right" },
                  ...(hasStatus ? [{ key: "status", label: "Status", kind: "badge" as const }] : []),
                  ...extraColumns,
                ]}
                rows={rows}
              />
            </div>
          )}
        </>
      )}
      {note && <p className="nb-mono mt-2">{note}</p>}
    </div>
  );
}

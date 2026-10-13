"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtInt, fmtNum, fmtPct } from "./format";

export type Cell = string | number | null;
export type TableRow = Record<string, Cell>;
export type Col = {
  key: string;
  label: string;
  kind?: "text" | "int" | "pct" | "dec" | "badge" | "link";
  align?: "left" | "right";
  sortable?: boolean;
  linkLabel?: string;
  hrefKey?: string;
};
type Props = {
  caption: string;
  columns: Col[];
  rows: TableRow[];
  searchKeys?: string[];
  searchLabel?: string;
  pageSize?: number;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  chips?: { label: string; flag: string }[];
  empty?: string;
};

const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

export function DataTable({ caption, columns, rows, searchKeys = [], searchLabel = "Cari", pageSize = 10, defaultSort, chips = [], empty = "Belum ada data untuk ditampilkan." }: Props) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(defaultSort ?? null);
  const [active, setActive] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Debounce pencarian agar mengetik tidak memicu penyaringan di setiap tombol.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => setPage(1), [q, active, sort, rows]);

  const view = useMemo(() => {
    let out = rows;
    if (q && searchKeys.length) out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
    for (const f of active) out = out.filter((r) => r[f] === 1);
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
        if (y === null || y === undefined) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))) * dir;
      });
    }
    return out;
  }, [rows, q, active, sort, searchKeys]);

  const pages = Math.max(1, Math.ceil(view.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = view.slice((cur - 1) * pageSize, cur * pageSize);

  const render = (c: Col, r: TableRow) => {
    const v = r[c.key];
    switch (c.kind) {
      case "int":
        return fmtInt(typeof v === "number" ? v : null);
      case "pct":
        return fmtPct(typeof v === "number" ? v : null, "—");
      case "dec":
        return fmtNum(typeof v === "number" ? v : null);
      case "badge":
        return v ? <span className="inline-block border-2 border-line px-2 py-0.5 text-xs font-bold">{String(v)}</span> : "—";
      case "link":
        return (
          <a href={String(r[c.hrefKey ?? "href"] ?? "#")} className="underline underline-offset-4">
            {c.linkLabel ?? "Buka"}
          </a>
        );
      default:
        return v === null || v === undefined || v === "" ? "—" : String(v);
    }
  };

  const tableMinWidth =
    columns.length <= 3
      ? "min-w-full"
      : columns.length <= 5
        ? "min-w-[28rem] sm:min-w-full"
        : "min-w-[38rem] sm:min-w-[42rem]";

  return (
    <div className="w-full min-w-0 max-w-full">
      {(searchKeys.length > 0 || chips.length > 0) && (
        <div className="mb-3 flex flex-wrap items-end gap-2 sm:gap-3">
          {searchKeys.length > 0 && (
            <div className="min-w-0 w-full sm:w-auto sm:min-w-[12rem] flex-1">
              <label className="mb-1 block font-display text-sm font-bold">
                {searchLabel}
                <input type="search" value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} className="nb-input mt-1 font-normal w-full" />
              </label>
            </div>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {chips.map((c) => {
                const on = active.includes(c.flag);
                return (
                  <button
                    key={c.flag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive((a) => (on ? a.filter((x) => x !== c.flag) : [...a, c.flag]))}
                    className={`nb-btn min-h-10 px-3 py-2 text-xs sm:text-sm ${on ? "" : "nb-btn-ghost"}`}
                  >
                    {on ? "✓ " : ""}
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="nb-mono" aria-live="polite">
          {view.length} baris{view.length !== rows.length ? ` dari ${rows.length}` : ""}
        </p>
        {columns.length > 3 && (
          <span className="nb-mono text-[10px] opacity-75 sm:hidden">
            ← Geser tabel ke samping →
          </span>
        )}
      </div>
      {view.length === 0 ? (
        <p className="nb-panel p-4 font-bold">{rows.length === 0 ? empty : "Tidak ada baris yang cocok dengan pencarian atau filter tabel."}</p>
      ) : (
        <div className="w-full max-w-full min-w-0 overflow-x-auto border-2 border-line focus:outline-none [webkit-overflow-scrolling:touch]" role="region" aria-label={caption} tabIndex={0}>
          <table className={`w-full border-collapse text-left text-sm ${tableMinWidth}`}>
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-accent text-ink">
              <tr>
                {columns.map((c) => {
                  const on = sort?.key === c.key;
                  return (
                    <th key={c.key} scope="col" aria-sort={on ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined} className={`border-b-2 border-line px-3 py-2 font-display font-bold ${c.align === "right" ? "text-right" : ""}`}>
                      {c.sortable === false || c.kind === "link" ? (
                        c.label
                      ) : (
                        <button type="button" onClick={() => setSort(on && sort?.dir === "desc" ? { key: c.key, dir: "asc" } : { key: c.key, dir: "desc" })} className="font-bold underline-offset-4 hover:underline">
                          {c.label}
                          {on ? (sort?.dir === "asc" ? " ▲" : " ▼") : ""}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <tr key={String(r.id ?? i)} className="border-b border-line/40 align-top odd:bg-surface">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                      {render(c, r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label={`Halaman tabel: ${caption}`} className="mt-3 flex items-center justify-between gap-3">
          <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">
            ← Sebelumnya
          </button>
          <span className="nb-mono">
            Halaman {cur} / {pages}
          </span>
          <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">
            Berikutnya →
          </button>
        </nav>
      )}
    </div>
  );
}

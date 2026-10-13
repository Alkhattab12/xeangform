"use client";

import { useEffect, useMemo, useState } from "react";
import { FIELD_META } from "@/lib/forms/field-meta";
import type { FieldType } from "@/lib/forms/schema";
import { AccumulationChart, KINDS, type AccItem, type Kind } from "./AccumulationChart";
import { fmtInt } from "./format";

export type QuestionAcc = {
  id: string;
  no: number;
  label: string;
  type: string;
  keyed: boolean;
  respondents: number;
  answered: number;
  items: AccItem[];
  href: string;
};

const PER_PAGE = 4;

/** Akumulasi respons untuk SETIAP soal. Setiap kartu punya lima jenis tampilan; pemilih di atas mengatur semua kartu sekaligus. */
export function QuestionAccumulation({ questions }: { questions: QuestionAcc[] }) {
  const [globalKind, setGlobalKind] = useState<Kind>("donut");
  const [overrides, setOverrides] = useState<Record<string, Kind>>({});
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => setPage(1), [q]);

  const view = useMemo(() => (q ? questions.filter((x) => `${x.no} ${x.label}`.toLowerCase().includes(q)) : questions), [questions, q]);
  const pages = Math.max(1, Math.ceil(view.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const slice = view.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  return (
    <section aria-labelledby="sec-akumulasi-soal" className="mt-12 w-full min-w-0 max-w-full">
      <h2 id="sec-akumulasi-soal" className="font-display text-3xl font-bold">Akumulasi respons setiap soal</h2>
      <p className="mt-1 text-sm opacity-80">
        Persentase = jumlah ÷ peserta ({fmtInt(questions[0]?.respondents ?? 0)}). ✓ jawaban benar, ✗ jawaban salah. Pada soal pilihan ganda satu peserta bisa memilih beberapa opsi, sehingga total persentase bisa melebihi 100%.
      </p>

      {questions.length === 0 ? (
        <p className="nb-panel nb-panel-strong mt-4 p-6 font-bold">Form ini belum punya soal.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3 sm:gap-4">
            <div>
              <p className="mb-1 font-display text-sm font-bold">Tampilan semua soal</p>
              <div role="group" aria-label="Jenis visualisasi untuk semua soal" className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    aria-pressed={globalKind === k.key}
                    onClick={() => {
                      setGlobalKind(k.key);
                      setOverrides({});
                    }}
                    className={`nb-btn min-h-10 px-3 py-2 text-xs sm:text-sm ${globalKind === k.key ? "" : "nb-btn-ghost"}`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 w-full sm:w-auto sm:min-w-[12rem] flex-1">
              <label className="mb-1 block font-display text-sm font-bold">
                Cari nomor atau teks soal
                <input type="search" value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} className="nb-input mt-1 font-normal w-full" />
              </label>
            </div>
          </div>
          <p className="nb-mono mt-3" aria-live="polite">
            {view.length} soal{view.length !== questions.length ? ` dari ${questions.length}` : ""}
          </p>

          {view.length === 0 ? (
            <p className="nb-panel mt-3 p-4 font-bold">Tidak ada soal yang cocok dengan pencarian.</p>
          ) : (
            <div className="mt-3 grid gap-6 lg:grid-cols-2 min-w-0 w-full">
              {slice.map((x) => (
                <article key={x.id} className="nb-panel nb-panel-strong p-4 min-w-0 max-w-full overflow-hidden" aria-labelledby={`aq-${x.id}`}>
                  <p className="nb-mono">
                    Soal {x.no} · {FIELD_META[x.type as FieldType]?.label ?? x.type}
                    {x.keyed ? " · Berkunci" : ""}
                  </p>
                  <h3 id={`aq-${x.id}`} className="mt-1 break-words font-display text-lg font-bold">{x.label}</h3>
                  <p className="mt-1 text-sm">{fmtInt(x.answered)} dari {fmtInt(x.respondents)} peserta menjawab</p>
                  <div className="mt-3 w-full min-w-0 max-w-full">
                    <AccumulationChart
                      name={`jawaban soal ${x.no}`}
                      items={x.items}
                      valueLabel="Pemilih"
                      rowLabel="Pilihan / jawaban"
                      pctLabel="Dari peserta"
                      compact
                      kind={overrides[x.id] ?? globalKind}
                      onKindChange={(k) => setOverrides((o) => ({ ...o, [x.id]: k }))}
                    />
                  </div>
                  <a href={x.href} className="nb-mono mt-3 inline-block underline underline-offset-4">Analisis lengkap soal ini →</a>
                </article>
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Halaman akumulasi soal" className="mt-5 flex items-center justify-between gap-3">
              <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">← Sebelumnya</button>
              <span className="nb-mono">Halaman {cur} / {pages}</span>
              <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm">Berikutnya →</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

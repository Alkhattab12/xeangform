"use client";

import { useState } from "react";
import { AccumulationChart, type AccItem } from "./AccumulationChart";
import type { Col } from "./DataTable";

export type Dimension = {
  key: string;
  label: string; // nama tab
  rowLabel: string;
  valueLabel: string;
  pctLabel: string;
  items: AccItem[];
  extraColumns?: Col[];
  note?: string;
};

/**
 * Akumulasi respons seluruh kuis, bisa dilihat menurut beberapa dimensi (kelas, waktu, nilai, kelulusan, status).
 * Setiap dimensi punya lima jenis tampilan: donat, lingkaran, batang, batang horizontal, dan tabel.
 */
export function QuizAccumulation({ dimensions, total }: { dimensions: Dimension[]; total: number }) {
  const [active, setActive] = useState(dimensions[0]?.key ?? "");
  const dim = dimensions.find((d) => d.key === active) ?? dimensions[0];

  return (
    <section aria-labelledby="sec-akumulasi" className="mt-12 w-full min-w-0 max-w-full">
      <h2 id="sec-akumulasi" className="font-display text-3xl font-bold">Akumulasi respons kuis</h2>
      <p className="mt-1 text-sm opacity-80">
        {total.toLocaleString("id-ID")} respons dalam filter aktif. Pilih dimensi; persentase = jumlah ÷ total respons pada dimensi itu. Jumlah respons bukan ukuran prestasi.
      </p>
      {!dim ? (
        <p className="nb-panel nb-panel-strong mt-4 p-6 font-bold">Belum ada data dalam cakupan filter ini.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Dimensi akumulasi" className="mt-4 flex flex-wrap gap-2">
            {dimensions.map((d) => (
              <button key={d.key} role="tab" type="button" aria-selected={d.key === dim.key} onClick={() => setActive(d.key)} className={`nb-btn min-h-10 px-3 py-2 text-sm ${d.key === dim.key ? "nb-btn-ink" : "nb-btn-ghost"}`}>
                {d.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="mt-4 w-full min-w-0 max-w-full" key={dim.key}>
            <AccumulationChart name={`respons ${dim.label.toLowerCase()}`} items={dim.items} valueLabel={dim.valueLabel} rowLabel={dim.rowLabel} pctLabel={dim.pctLabel} extraColumns={dim.extraColumns} note={dim.note} />
          </div>
        </>
      )}
    </section>
  );
}

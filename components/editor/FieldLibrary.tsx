"use client";

import { Plus } from "lucide-react";
import { FIELD_GROUPS, FIELD_META } from "@/lib/forms/field-meta";
import type { FieldType } from "@/lib/forms/schema";

export function FieldLibrary({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <div className="nb-panel nb-panel-strong p-4">
      <h2 className="font-display text-xl font-bold">Tambah kolom</h2>
      {FIELD_GROUPS.map((g) => (
        <div key={g.title} className="mt-4">
          <p className="nb-mono mb-2">{g.title}</p>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {g.types.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => onAdd(t)}
                  className="nb-panel flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left font-bold hover:bg-accent hover:text-ink"
                >
                  <Plus size={16} aria-hidden="true" />
                  {FIELD_META[t].label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

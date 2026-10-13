"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Download, GripVertical, Link2, Plus, Trash2 } from "lucide-react";
import { saveForm, setFormStatus, type SaveResult, type StatusResult } from "@/app/actions/forms";
import { FIELD_META, createField, newFieldId, newOptionId } from "@/lib/forms/field-meta";
import { useBusyOverlay } from "@/components/ui/LoadingProvider";
import { buildExport } from "@/lib/forms/portable";
import { hasAnswerKey, isGradable, type FieldType, type FormField, type FormSettings, type FormStatus, type FormTheme } from "@/lib/forms/schema";
import { fieldStyleVars, resolveTheme, themeStyle } from "@/lib/forms/theme";
import { FieldLibrary } from "./FieldLibrary";
import { FieldPreview } from "./FieldPreview";
import { FieldSettings } from "./FieldSettings";
import { FormSettingsPanel } from "./FormSettingsPanel";
import { ThemePanel } from "./ThemePanel";
import { AudioSettingsPanel } from "./AudioSettingsPanel";
import { DEFAULT_AUDIO_SETTINGS } from "@/lib/forms/schema";

type Initial = { id: string; title: string; description: string; slug: string; status: FormStatus; fields: FormField[]; settings: FormSettings; theme: FormTheme | null };
type SaveState = "saved" | "dirty" | "saving" | "error";
type Tab = "fields" | "canvas" | "settings";

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Tersimpan",
  dirty: "Belum disimpan",
  saving: "Menyimpan…",
  error: "Gagal menyimpan",
};
const STATUS_LABEL: Record<FormStatus, string> = { draft: "Draft", published: "Terbit", archived: "Arsip" };
const smallBtn = "nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm";

type ItemProps = {
  field: FormField;
  index: number;
  total: number;
  quiz: boolean;
  page: number;
  pages: number;
  selected: boolean;
  onSelect: () => void;
  onOpenSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
};

function SortableItem(p: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = FIELD_META[p.field.type];

  return (
    <li
      ref={setNodeRef}
      style={{ ...fieldStyleVars(p.field.style), ...style }}
      className={`nb-panel relative p-4 ${p.selected ? "nb-shadow outline-3 outline-offset-2 outline-solid outline-cobalt" : ""} ${isDragging ? "z-10 opacity-80" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Pindahkan kolom ${p.index + 1}. Tekan spasi lalu panah untuk memindahkan.`}
          className="mt-1 flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center border-2 border-line bg-surface active:cursor-grabbing"
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
        <div
          role="button"
          tabIndex={0}
          aria-pressed={p.selected}
          aria-label={`${meta.label}: ${p.field.label || "tanpa judul"}. Pilih untuk mengatur.`}
          onClick={p.onSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              p.onSelect();
            }
          }}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <p className="nb-mono mb-2">
            {String(p.index + 1).padStart(2, "0")} / {meta.label}
            {p.pages > 1 ? ` · Hal. ${p.page}` : ""}
            {p.quiz && isGradable(p.field.type) ? (hasAnswerKey(p.field) ? " · Kunci ✓" : " · Tanpa kunci") : ""}
          </p>
          <div className="pointer-events-none">
            <FieldPreview field={p.field} />
          </div>
        </div>
      </div>

      {p.selected && (
        <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-line pt-3">
          <button type="button" onClick={p.onOpenSettings} className={`${smallBtn} lg:hidden`}>Atur</button>
          <button type="button" aria-label="Naikkan kolom" disabled={p.index === 0} onClick={() => p.onMove(-1)} className={smallBtn}>
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Turunkan kolom" disabled={p.index === p.total - 1} onClick={() => p.onMove(1)} className={smallBtn}>
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={p.onDuplicate} className={smallBtn}>
            <Copy size={16} aria-hidden="true" /> Duplikat
          </button>
          <button type="button" onClick={p.onDelete} className={smallBtn}>
            <Trash2 size={16} aria-hidden="true" /> Hapus
          </button>
        </div>
      )}
    </li>
  );
}

export function FormEditor({ initial }: { initial: Initial }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [settings, setSettings] = useState<FormSettings>(initial.settings);
  const [theme, setTheme] = useState<FormTheme | null>(initial.theme);
  const [asideTab, setAsideTab] = useState<"form" | "theme" | "audio">("form");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<FormStatus>(initial.status);
  const [save, setSave] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState<Tab>("canvas");
  const [busy, setBusy] = useState(false);
  useBusyOverlay(busy);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---------- Autosave (debounce 1,5 dtk, simpan berurutan) ----------
  const latest = useRef({ title, description, fields, settings, theme });
  latest.current = { title, description, fields, settings, theme };
  const version = useRef(0);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));

  async function run(): Promise<boolean> {
    const v = version.current;
    const snap = latest.current;
    setSave("saving");
    let res: SaveResult;
    try {
      res = await saveForm(initial.id, {
        title: snap.title,
        description: snap.description,
        schema: { fields: snap.fields },
        settings: snap.settings,
        theme: snap.theme,
      });
    } catch {
      res = { ok: false, error: "Koneksi bermasalah. Perubahan belum tersimpan." };
    }
    if (!res.ok) {
      setSave("error");
      setSaveError(res.error);
      return false;
    }
    if (version.current === v) {
      dirty.current = false;
      setSave("saved");
    } else {
      setSave("dirty"); // ada perubahan baru saat menyimpan; timer berikutnya menyimpannya
    }
    return true;
  }
  const saveRef = useRef(run);
  saveRef.current = run;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    chain.current = chain.current.then(() => saveRef.current());
    return chain.current;
  }, []);

  const markDirty = useCallback(() => {
    version.current += 1;
    dirty.current = true;
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, 1500);
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) void flush(); // simpan sisa perubahan saat pindah halaman
    },
    [flush],
  );

  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  // ---------- Operasi kolom ----------
  const selected = fields.find((f) => f.id === selectedId) ?? null;

  const changeTheme = (t: FormTheme | null) => {
    setTheme(t);
    markDirty();
  };

  const changeSettings = (patch: Partial<FormSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const patchField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    markDirty();
  };
  const addField = (type: FieldType) => {
    const f = createField(type);
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
    setTab("canvas");
    markDirty();
  };
  const duplicateField = (id: string) => {
    const i = fields.findIndex((f) => f.id === id);
    if (i < 0) return;
    const src = fields[i];
    const idMap = new Map<string, string>();
    const newOptions = src.options?.map((o) => {
      const nid = newOptionId();
      idMap.set(o.id, nid);
      return { ...o, id: nid };
    });
    const copy: FormField = {
      ...src,
      id: newFieldId(),
      options: newOptions,
      answerKey: src.answerKey
        ? { ...src.answerKey, optionIds: src.answerKey.optionIds?.map((x) => idMap.get(x) ?? x) }
        : undefined,
    };
    const next = [...fields];
    next.splice(i + 1, 0, copy);
    setFields(next);
    setSelectedId(copy.id);
    markDirty();
  };
  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    markDirty();
  };
  const moveField = (id: string, dir: -1 | 1) => {
    const i = fields.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= fields.length) return;
    setFields(arrayMove(fields, i, j));
    markDirty();
  };
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from < 0 || to < 0) return;
    setFields(arrayMove(fields, from, to));
    markDirty();
  };

  // ---------- Publikasi ----------
  async function changeStatus(next: FormStatus) {
    setBusy(true);
    setNotice(null);
    const saved = await flush();
    if (!saved) {
      setBusy(false);
      setNotice({ kind: "error", text: "Perubahan terakhir belum tersimpan. Coba simpan dulu." });
      return;
    }
    let res: StatusResult;
    try {
      res = await setFormStatus(initial.id, next);
    } catch {
      res = { ok: false, error: "Koneksi bermasalah. Coba lagi." };
    }
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error });
      return;
    }
    setStatus(res.status);
    setNotice({ kind: "ok", text: next === "published" ? "Form diterbitkan." : "Form ditarik kembali menjadi draft." });
  }

  async function copyLink() {
    const url = `${window.location.origin}/f/${initial.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ kind: "ok", text: "Tautan disalin." });
    } catch {
      setNotice({ kind: "error", text: `Salin manual: ${url}` });
    }
  }

  function exportJson() {
    const payload = buildExport(title, description, fields, settings, theme);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "form";
    a.href = url;
    a.download = `${base}.syamil-form.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice({ kind: "ok", text: "File JSON diunduh." });
  }

  const show = (t: Tab) => `${tab === t ? "block" : "hidden"} lg:block`;
  const canvasStyle = theme ? themeStyle(resolveTheme(theme)) : undefined;
  const pageInfo = (() => {
    let p = 1;
    const nums: number[] = [];
    for (const f of fields) {
      if (f.type === "page_break") p += 1;
      nums.push(p);
    }
    return { nums, total: p };
  })();

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-4">
      <div className="nb-panel nb-panel-strong sticky top-0 z-30 mb-4 flex flex-wrap items-center gap-3 p-3">
        <Link href="/dashboard" className={smallBtn}>
          <ArrowLeft size={16} aria-hidden="true" /> Dashboard
        </Link>
        <Link href={`/dashboard/forms/${initial.id}/responses`} className={smallBtn}>Respons</Link>
        <span className="nb-mono border-2 border-line px-2 py-1">{STATUS_LABEL[status]}</span>
        <p className="nb-mono" role="status" aria-live="polite">{SAVE_LABEL[save]}</p>
        {save === "error" && (
          <button type="button" onClick={() => void flush()} className={smallBtn}>Coba lagi</button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {status === "published" && (
            <button type="button" onClick={() => void copyLink()} className={smallBtn}>
              <Link2 size={16} aria-hidden="true" /> Salin tautan
            </button>
          )}
          <button type="button" onClick={exportJson} className={smallBtn}>
            <Download size={16} aria-hidden="true" /> Ekspor
          </button>
          <button type="button" onClick={() => void flush()} disabled={save === "saved" || save === "saving"} className={smallBtn}>
            Simpan
          </button>
          {status === "published" ? (
            <button type="button" onClick={() => void changeStatus("draft")} disabled={busy} className="nb-btn nb-btn-ink min-h-10 px-3 py-2 text-sm">
              Tarik kembali
            </button>
          ) : (
            <button type="button" onClick={() => void changeStatus("published")} disabled={busy} className="nb-btn min-h-10 px-3 py-2 text-sm">
              {busy ? "Memproses…" : "Terbitkan"}
            </button>
          )}
        </div>
      </div>

      {save === "error" && saveError && (
        <div role="alert" className="nb-panel mb-4 border-[3px] bg-orange p-3 font-bold text-ink">{saveError}</div>
      )}
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`nb-panel mb-4 border-[3px] p-3 font-bold text-ink ${notice.kind === "error" ? "bg-orange" : "bg-accent"}`}
        >
          {notice.text}
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 lg:hidden" role="group" aria-label="Panel editor">
        {(
          [
            ["fields", "Kolom"],
            ["canvas", "Kanvas"],
            ["settings", "Atur"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={`nb-btn min-h-11 ${tab === k ? "" : "nb-btn-ghost"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside aria-label="Pustaka kolom" className={`${show("fields")} lg:sticky lg:top-24 lg:self-start`}>
          <FieldLibrary onAdd={addField} />
        </aside>

        <section aria-label="Kanvas form" className={`${show("canvas")} ${theme ? "p-3" : ""}`} style={canvasStyle}>
          <div className="nb-panel nb-panel-strong nb-shadow p-5">
            <label htmlFor="form-title" className="sr-only">Judul form</label>
            <input
              id="form-title"
              value={title}
              maxLength={200}
              placeholder="Judul form"
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              className="w-full border-0 border-b-2 border-line bg-transparent pb-2 font-display text-3xl font-bold sm:text-4xl"
            />
            <label htmlFor="form-desc" className="sr-only">Deskripsi form</label>
            <textarea
              id="form-desc"
              rows={2}
              value={description}
              maxLength={2000}
              placeholder="Deskripsi singkat (opsional)"
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
              className="mt-4 w-full border-0 border-b-2 border-line bg-transparent pb-2"
            />
            {status === "published" && (
              <p className="nb-mono mt-3">Perubahan langsung berlaku di form publik.</p>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="nb-panel mt-4 p-8 text-center">
              <p className="font-display text-2xl font-bold">Belum ada kolom.</p>
              <p className="mt-2">Pilih jenis kolom dari panel &quot;Kolom&quot; untuk mulai menyusun form.</p>
              <button type="button" onClick={() => setTab("fields")} className="nb-btn mt-4 lg:hidden">Tambah kolom</button>
            </div>
          ) : (
            <DndContext id="form-fields" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <ol className="mt-4 space-y-4">
                  {fields.map((f, i) => (
                    <SortableItem
                      key={f.id}
                      field={f}
                      index={i}
                      total={fields.length}
                      quiz={settings.quiz}
                      page={pageInfo.nums[i]}
                      pages={pageInfo.total}
                      selected={f.id === selectedId}
                      onSelect={() => setSelectedId(f.id)}
                      onOpenSettings={() => {
                        setSelectedId(f.id);
                        setTab("settings");
                      }}
                      onDuplicate={() => duplicateField(f.id)}
                      onDelete={() => removeField(f.id)}
                      onMove={(d) => moveField(f.id, d)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          {fields.length > 0 && (
            <button type="button" onClick={() => addField("page_break")} className="nb-btn nb-btn-ghost mt-4 w-full">
              <Plus size={18} aria-hidden="true" /> Tambah halaman baru
            </button>
          )}
        </section>

        <aside aria-label="Pengaturan kolom" className={`${show("settings")} lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto`}>
          {selected ? (
            <div>
              <button type="button" onClick={() => setSelectedId(null)} className={`${smallBtn} mb-3`}>
                <ArrowLeft size={16} aria-hidden="true" /> Pengaturan form
              </button>
              <div className="nb-panel nb-panel-strong p-4">
                <p className="nb-mono mb-4">{FIELD_META[selected.type].label} / {selected.id}</p>
                <FieldSettings key={selected.id} field={selected} quiz={settings.quiz} onChange={(patch) => patchField(selected.id, patch)} />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 grid grid-cols-3 gap-2" role="group" aria-label="Pengaturan form">
                <button type="button" aria-pressed={asideTab === "form"} onClick={() => setAsideTab("form")} className={`nb-btn min-h-10 px-2 py-2 text-xs sm:text-sm font-bold ${asideTab === "form" ? "" : "nb-btn-ghost"}`}>Form</button>
                <button type="button" aria-pressed={asideTab === "theme"} onClick={() => setAsideTab("theme")} className={`nb-btn min-h-10 px-2 py-2 text-xs sm:text-sm font-bold ${asideTab === "theme" ? "" : "nb-btn-ghost"}`}>Tema</button>
                <button type="button" aria-pressed={asideTab === "audio"} onClick={() => setAsideTab("audio")} className={`nb-btn min-h-10 px-2 py-2 text-xs sm:text-sm font-bold ${asideTab === "audio" ? "" : "nb-btn-ghost"}`}>Audio</button>
              </div>
              {asideTab === "form" ? (
                <FormSettingsPanel settings={settings} onChange={changeSettings} />
              ) : asideTab === "theme" ? (
                <ThemePanel theme={theme} onChange={changeTheme} />
              ) : (
                <AudioSettingsPanel
                  audio={settings.audio ?? DEFAULT_AUDIO_SETTINGS}
                  activeTheme={theme?.preset}
                  formId={initial.id}
                  onChange={(patch) => {
                    changeSettings({
                      audio: { ...(settings.audio ?? DEFAULT_AUDIO_SETTINGS), ...patch },
                    });
                  }}
                />
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

import type { createClient } from "@/lib/supabase/server";
import { formSchemaJson, hasAnswerKey, parseSettings } from "@/lib/forms/schema";
import { analyze, classRows, detectGroupField, GROUP_TYPES, previousRange, scoreSubmissions, selectResponses, summarize, type Analytics, type Range, type Summary, type Scored } from "./compute";
import type { AnalyticsFilters } from "./filters";
import { loadSubmissions } from "./load";
import type { FormField, FormSettings } from "@/lib/forms/schema";

type Db = Awaited<ReturnType<typeof createClient>>;

export type RunResult =
  | { ok: false; error: string }
  | {
      ok: true;
      fields: FormField[];
      settings: FormSettings;
      groupField: FormField | null;
      keyed: number;
      rows: Scored[];
      analytics: Analytics;
      groupOptions: string[];
      prevRange: Range | null;
      prevSummary: Summary | null;
      span: { from: string; to: string } | null;
      total: number;
      loaded: number;
      capped: boolean;
      hasRespondentColumn: boolean;
    };

/**
 * Satu pipeline untuk halaman analitik dan ekspor: muat -> nilai ulang -> saring -> hitung.
 * Karena semua komponen memakai `rows` yang sama, kartu, grafik, tabel, dan ekspor selalu konsisten.
 */
export async function runAnalytics(db: Db, formId: string, form: { schema_json: unknown; settings_json: unknown }, filters: AnalyticsFilters): Promise<RunResult> {
  const parsed = formSchemaJson.safeParse(form.schema_json);
  if (!parsed.success) return { ok: false, error: "Struktur form rusak, tidak bisa dianalisis." };
  const fields = parsed.data.fields;
  const settings = parseSettings(form.settings_json);
  const groupField = filters.group ? (fields.find((f) => f.id === filters.group && GROUP_TYPES.has(f.type)) ?? null) : detectGroupField(fields);

  const prevRange = previousRange(filters);
  const loaded = await loadSubmissions(db, formId, { from: prevRange ? prevRange.from : filters.from, to: filters.to });
  if (loaded.error) return { ok: false, error: "Gagal memuat respons. Muat ulang halaman untuk mencoba lagi." };

  const keyed = fields.filter(hasAnswerKey).length;
  const scored = scoreSubmissions(fields, loaded.rows, groupField);
  const rows = selectResponses(scored, filters);
  const analytics = analyze(rows, fields, filters);
  const groupOptions = classRows(selectResponses(scored, filters, { ignoreClass: true }), filters.pass).map((c) => c.label);
  const prevSummary = prevRange ? summarize(selectResponses(scored, filters, { range: prevRange }), keyed, filters.pass) : null;
  const days = rows.map((r) => r.day).sort();
  return {
    ok: true,
    fields,
    settings,
    groupField,
    keyed,
    rows,
    analytics,
    groupOptions,
    prevRange,
    prevSummary,
    span: days.length ? { from: days[0], to: days[days.length - 1] } : null,
    total: loaded.total,
    loaded: loaded.rows.length,
    capped: loaded.capped,
    hasRespondentColumn: loaded.hasRespondentColumn,
  };
}

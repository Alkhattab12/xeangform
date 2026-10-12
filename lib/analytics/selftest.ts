// Uji hitung independen. Jalankan: npx tsx lib/analytics/selftest.ts
import assert from "node:assert/strict";
import { gradeQuiz } from "@/lib/forms/grade";
import type { FormField } from "@/lib/forms/schema";
import { analyze, changes, questionAccumulations, detectGroupField, previousRange, questionDetail, scoreSubmissions, selectResponses, summarize, type RawSubmission } from "./compute";
import { parseAnalyticsFilters } from "./filters";

const opt = (id: string, label: string) => ({ id, label });
const fields: FormField[] = [
  { id: "kelas", type: "radio", label: "Kelas", required: true, options: [opt("k1", "XII-1"), opt("k2", "XII-2"), opt("k10", "XII-10")] },
  { id: "q1", type: "radio", label: "Soal 1", required: false, options: [opt("a", "A"), opt("b", "B"), opt("c", "C")], answerKey: { optionIds: ["b"] } },
  { id: "q2", type: "checkbox", label: "Soal 2", required: false, options: [opt("x", "X"), opt("y", "Y"), opt("z", "Z")], answerKey: { optionIds: ["x", "y"] } },
  { id: "q3", type: "short_text", label: "Soal 3", required: false, answerKey: { text: ["Jakarta"] } },
  { id: "q4", type: "number", label: "Soal 4", required: false, answerKey: { number: 42 } },
  { id: "s1", type: "rating", label: "Kepuasan", required: false, ratingMax: 5 },
];

let n = 0;
const sub = (day: string, who: string | null, kelas: string, a: Record<string, unknown>, status = "received"): RawSubmission => ({
  id: `r${++n}`,
  submitted_at: `${day}T05:00:00Z`, // 12:00 WIB
  status,
  respondentId: who,
  meta: who ? { respondent: { email: `${who}@x.id` } } : {},
  answers: { kelas: { optionId: kelas }, ...a },
});
const all = { q1: { optionId: "b" }, q2: { optionIds: ["x", "y"] }, q3: "  jakarta ", q4: 42, s1: 5 };

const subs: RawSubmission[] = [
  sub("2026-10-01", "u1", "k1", all), // 4/4 = 100
  sub("2026-10-02", "u1", "k1", { ...all, q1: { optionId: "a" }, q4: 41 }), // ulang: 2/4 = 50
  sub("2026-10-02", "u2", "k2", { q1: { optionId: "b" }, s1: 3 }), // 1 benar, 3 kosong -> 25
  sub("2026-10-03", null, "k2", { ...all, q2: { optionIds: ["x"] } }), // anonim: 3/4 = 75
  sub("2026-10-04", "u3", "k10", { q1: { optionId: "c" }, q2: { optionIds: ["x", "y"], other: "?" } }), // 0 benar, 2 salah, 2 kosong
  sub("2026-10-05", "u4", "k1", all, "spam"), // spam: dikeluarkan
];

const f = parseAnalyticsFilters({});
const group = detectGroupField(fields);
assert.equal(group?.id, "kelas");
const scored = scoreSubmissions(fields, subs, group);

// 1) Skor ulang harus sama persis dengan gradeQuiz untuk setiap respons
for (const s of subs) {
  const g = gradeQuiz(fields, s.answers);
  const r = scored.find((x) => x.id === s.id)!;
  assert.equal(r.correct, g.correct, `benar ${s.id}`);
  assert.equal(r.graded, g.total);
}

const rows = selectResponses(scored, f);
assert.equal(rows.length, 5, "spam tidak ikut");
const sm = summarize(rows, 4, 70);
assert.equal(sm.responses, 5);
assert.equal(sm.participants, 4 - 1, "u1,u2,u3 (anonim tidak dihitung unik)");
assert.equal(sm.identified, 4);
assert.equal(sm.correct, 4 + 2 + 1 + 3 + 0);
assert.equal(sm.scoreMax, 20);
assert.equal(sm.blank, 0 + 0 + 3 + 0 + 2);
assert.equal(sm.wrong, 0 + 2 + 0 + 1 + 2);
assert.equal(sm.accuracy, (10 / 15) * 100);
assert.equal(sm.perResponse.mean, (100 + 50 + 25 + 75 + 0) / 5);
assert.equal(sm.perResponse.median, 50);
assert.equal(sm.perResponse.min, 0);
assert.equal(sm.perResponse.max, 100);
assert.equal(sm.perResponse.passed, 2, "KKM 70: 100 dan 75");
// rata-rata per peserta unik: u1=(100+50)/2=75, u2=25, u3=0 -> 33,33 (anonim tidak masuk)
assert.ok(Math.abs((sm.perParticipant.mean as number) - (75 + 25 + 0) / 3) < 1e-9);

// 2) Percobaan pertama / terakhir
const first = selectResponses(scored, { ...f, attempt: "pertama" });
assert.equal(first.length, 4);
assert.equal(summarize(first, 4, 70).perResponse.mean, (100 + 25 + 75 + 0) / 4);
const last = selectResponses(scored, { ...f, attempt: "terakhir" });
assert.equal(summarize(last, 4, 70).perResponse.mean, (50 + 25 + 75 + 0) / 4);

// 3) Filter kelas & tanggal memakai cakupan yang sama
assert.equal(selectResponses(scored, { ...f, cls: "XII-1" }).length, 2);
assert.equal(selectResponses(scored, { ...f, from: "2026-10-02", to: "2026-10-03" }).length, 3);
assert.equal(selectResponses(scored, { ...f, from: "2030-01-01" }).length, 0);
assert.equal(summarize([], 4, 70).accuracy, null, "tanpa data -> null, bukan NaN");
assert.equal(summarize([], 4, 70).perResponse.mean, null);
assert.equal(selectResponses(scored, { ...f, smin: 70 }).length, 2);

// 4) Kelas: urutan natural (XII-2 sebelum XII-10) dan jumlah/persentase konsisten
const a = analyze(rows, fields, f);
assert.deepEqual(a.classes.map((c) => c.label), ["XII-1", "XII-2", "XII-10"]);
assert.deepEqual(a.classes.map((c) => c.responses), [2, 2, 1]);
assert.ok(Math.abs(a.classes.reduce((x, c) => x + (c.share as number), 0) - 100) < 1e-9);
assert.equal(a.classes[0].avg, 75);
assert.equal(a.classes[0].participants, 1);

// 5) Histogram: jumlah semua rentang = jumlah respons bernilai
assert.equal(a.histogram.reduce((x, b) => x + b.count, 0), 5);
assert.equal(a.histogram.find((b) => b.label === "90–100")?.count, 1);
assert.equal(a.histogram.find((b) => b.label === "0–49")?.count, 2);

// 6) Per soal
const q1 = a.questions.find((q) => q.id === "q1")!;
assert.equal(q1.answered, 5);
assert.equal(q1.correct, 3); // r1, r3, r4
assert.equal(q1.wrong, 2);
assert.equal(q1.pctCorrect, 60);
assert.equal(q1.difficulty, "sedang");
assert.equal(q1.limited, true, "sampel < 10");
const q2 = a.questions.find((q) => q.id === "q2")!;
assert.equal(q2.blank, 1);
assert.equal(q2.answered, 4);
assert.equal(q2.correct, 2); // r1, r2
assert.equal(q2.wrong, 2); // r4 (kurang), r5 (ada "lainnya")
const q3 = a.questions.find((q) => q.id === "q3")!;
assert.equal(q3.correct, 3);
assert.equal(q3.blank, 2);
assert.equal(q3.pctBlank, 40);
const s1 = a.questions.find((q) => q.id === "s1")!;
assert.equal(s1.keyed, false);
assert.equal(s1.correct, null);
assert.equal(s1.difficulty, null);

// 7) Detail soal: distribusi opsi, opsi terpopuler, perbandingan kelas dengan penyebut per kelas
const d1 = questionDetail(rows, fields, "q1", f)!;
assert.deepEqual(d1.options.map((o) => o.count), [1, 3, 1]);
assert.equal(d1.row.topLabel, "B");
assert.equal(d1.row.topCorrect, true);
assert.equal(d1.row.review, false);
assert.equal(d1.gap, 2);
assert.deepEqual(d1.byClass.map((c) => [c.label, c.n, c.pct]), [["XII-1", 2, 50], ["XII-2", 2, 100], ["XII-10", 1, 0]]);
const d1o = d1.options.find((o) => o.id === "b")!;
assert.equal(d1o.correct, true);
assert.equal(d1o.pct, 60);
const ds = questionDetail(rows, fields, "s1", f)!;
assert.equal(ds.mean, 4.5);
assert.equal(ds.options.find((o) => o.id === "5")?.count, 3);
assert.equal(ds.row.review, false);
assert.equal(questionDetail(rows, fields, "tidak-ada", f), null);
// opsi terpopuler salah -> ditandai perlu ditinjau
const wrongTop = scoreSubmissions(fields, [sub("2026-10-01", "p1", "k1", { q1: { optionId: "a" } }), sub("2026-10-01", "p2", "k1", { q1: { optionId: "a" } }), sub("2026-10-01", "p3", "k1", { q1: { optionId: "b" } })], group);
assert.equal(questionDetail(wrongTop, fields, "q1", f)!.row.review, true);

// 8) Tren & periode pembanding
assert.deepEqual(a.trend.map((t) => [t.key, t.n]), [["2026-10-01", 1], ["2026-10-02", 2], ["2026-10-03", 1], ["2026-10-04", 1]]);
assert.equal(a.trend[1].avg, 37.5);
const wk = analyze(rows, fields, { ...f, interval: "minggu" });
assert.deepEqual(wk.trend.map((t) => [t.key, t.n, t.avg]), [["2026-09-28", 5, 50]]);
const gap = analyze(selectResponses(scored, f).filter((r) => r.day !== "2026-10-02" && r.day !== "2026-10-03"), fields, f);
assert.deepEqual(gap.trend.map((t) => [t.key, t.avg === null]), [["2026-10-01", false], ["2026-10-02", true], ["2026-10-03", true], ["2026-10-04", false]], "hari tanpa data = null, bukan 0");
assert.deepEqual(previousRange({ ...f, from: "2026-10-04", to: "2026-10-05" }), { from: "2026-10-02", to: "2026-10-03" });
assert.equal(previousRange(f), null);
const prev = summarize(selectResponses(scored, f, { range: { from: "2026-10-01", to: "2026-10-02" } }), 4, 70);
const cur = summarize(selectResponses(scored, f, { range: { from: "2026-10-03", to: "2026-10-04" } }), 4, 70);
assert.equal(prev.responses, 3);
assert.equal(cur.responses, 2);
const ch = changes(cur, prev);
assert.equal(ch.enough, false, "periode pembanding < 5 respons tidak dianggap memadai");
assert.ok(Math.abs((ch.items[0].delta as number) - (-100 / 3)) < 1e-9);

// 9) Form tanpa kunci jawaban (survei): tidak ada nilai, bukan 0
const survey = fields.map((x) => ({ ...x, answerKey: undefined }));
const sScored = scoreSubmissions(survey, subs, group);
const sa = analyze(selectResponses(sScored, f), survey, f);
assert.equal(sa.summary.hasScores, false);
assert.equal(sa.summary.perResponse.n, 0);
assert.equal(sa.summary.accuracy, null);
assert.equal(sa.histogram.every((b) => b.count === 0 && b.pct === null), true);

// 10) Akumulasi respons untuk SETIAP soal; persentase dari jumlah peserta
const acc = questionAccumulations(rows, fields, f);
assert.equal(acc.length, 6, "kelas, q1..q4, s1");
for (const q of acc) {
  assert.equal(q.respondents, 5);
  assert.equal(q.items.at(-1)?.blank, true, "selalu ada butir 'Tidak dijawab'");
  assert.equal(q.items.at(-1)?.value, q.blank);
}
const aq1 = acc.find((q) => q.id === "q1")!;
assert.deepEqual(aq1.items.map((i) => i.value), [1, 3, 1, 0]); // A,B,C,kosong
assert.deepEqual(aq1.items.map((i) => i.pct), [20, 60, 20, 0]);
assert.equal(aq1.items.reduce((x, i) => x + i.value, 0), 5, "pilihan tunggal: total = peserta");
const aq3 = acc.find((q) => q.id === "q3")!; // isian: menjawab vs kosong
assert.deepEqual(aq3.items.map((i) => [i.label, i.value]), [["jakarta", 3], ["Tidak dijawab", 2]]); // berkunci: jawaban terbanyak
const sAcc = questionAccumulations(selectResponses(sScored, f), survey, f).find((q) => q.id === "q3")!;
assert.deepEqual(sAcc.items.map((i) => [i.label, i.value]), [["Menjawab", 3], ["Tidak dijawab", 2]], "isian tanpa kunci: tidak membuka isi jawaban (mis. nama)");
const aq2 = acc.find((q) => q.id === "q2")!; // checkbox boleh > 100%
assert.equal(aq2.items.find((i) => i.key === "x")?.value, 4);
// 11) Akumulasi kuis: per waktu & status
assert.deepEqual(a.timeline.map((t) => [t.key, t.n]), [["2026-10-01", 1], ["2026-10-02", 2], ["2026-10-03", 1], ["2026-10-04", 1]]);
assert.equal(a.timeline.reduce((x, t) => x + t.n, 0), a.summary.responses);
assert.deepEqual(a.statusCounts, [{ status: "received", label: "Diterima", count: 5 }]);
const withSpam = analyze(selectResponses(scored, { ...f, status: "spam" }), fields, { ...f, status: "spam" });
assert.deepEqual(withSpam.statusCounts, [{ status: "spam", label: "Spam", count: 1 }]);

console.log("semua uji analitik lulus");

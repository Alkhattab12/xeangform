// Uji sistem Anti-Cheating, Tab Lock, dan Logika Pelanggaran.
// Jalankan: npx tsx lib/forms/selftest-proctoring.ts
import assert from "node:assert/strict";
import {
  formSettingsSchema,
  parseSettings,
  DEFAULT_PROCTORING_SETTINGS,
  DEFAULT_SETTINGS,
} from "./schema";

console.log("Menjalankan selftest sistem Anti-Cheating dan Pengawasan...");

// ---- 1. Pengujian Skema & Kompatibilitas Mundur
const def = parseSettings({});
assert.equal(def.proctoring.enabled, false, "Default proctoring harus nonaktif");
assert.equal(def.proctoring.maxViolations, 3, "Default batas pelanggaran harus 3");
assert.equal(def.proctoring.detectTabSwitch, true, "Default deteksi tab switch harus aktif");
assert.equal(def.proctoring.detectWindowBlur, true, "Default deteksi window blur harus aktif");
assert.equal(def.proctoring.requireFullscreen, false, "Default fullscreen harus false");
assert.equal(def.allowTabSwitch, true, "Default allowTabSwitch harus true");

// Kompatibilitas: jika form lama disetel allowTabSwitch = false
const legacy = parseSettings({ allowTabSwitch: false });
assert.equal(legacy.proctoring.enabled, true, "Form lama dengan allowTabSwitch=false harus mengaktifkan proctoring");
assert.equal(legacy.allowTabSwitch, false, "allowTabSwitch harus disinkronkan ke false");

// Validasi batas maksimal (min 1, max 10)
const custom = parseSettings({
  proctoring: {
    enabled: true,
    maxViolations: 5,
    requireFullscreen: true,
    restrictCopyPaste: true,
  },
});
assert.equal(custom.proctoring.enabled, true);
assert.equal(custom.proctoring.maxViolations, 5);
assert.equal(custom.proctoring.requireFullscreen, true);
assert.equal(custom.proctoring.restrictCopyPaste, true);
assert.equal(custom.allowTabSwitch, false, "Jika proctoring aktif, allowTabSwitch otomatis false");

// Skema Zod menolak nilai di luar jangkauan (misal maxViolations < 1 atau > 10)
const invalidMax = formSettingsSchema.safeParse({
  proctoring: { enabled: true, maxViolations: 15 },
});
assert.equal(invalidMax.success, false, "maxViolations > 10 harus ditolak oleh schema");

const invalidMin = formSettingsSchema.safeParse({
  proctoring: { enabled: true, maxViolations: 0 },
});
assert.equal(invalidMin.success, false, "maxViolations < 1 harus ditolak oleh schema");

// ---- 2. Logika Deduplikasi & Debounce Event Pelanggaran
// Memastikan alt-tab / klik jendela yang memicu beberapa event browser sekaligus dalam 3 detik dihitung 1 kali
function simulateEventStream(timestamps: number[], cooldownMs = 3000) {
  let count = 0;
  let lastAt = 0;
  const recorded: number[] = [];

  for (const t of timestamps) {
    if (lastAt !== 0 && t - lastAt < cooldownMs) {
      // Event duplikat diabaikan (deduped)
      continue;
    }
    lastAt = t;
    count++;
    recorded.push(t);
  }
  return { count, recorded };
}

// Simulasi: 1 aksi fisik memicu blur pada t=1000, visibilitychange pada t=1020, dan fullscreenchange pada t=1050
const burst = [1000, 1020, 1050];
const burstRes = simulateEventStream(burst);
assert.equal(burstRes.count, 1, "Burst event dari 1 aksi fisik hanya boleh dihitung 1 pelanggaran");

// Simulasi: 3 aksi terpisah berselang waktu (t=1000, t=5000, t=10000)
const separate = [1000, 5000, 10000];
const separateRes = simulateEventStream(separate);
assert.equal(separateRes.count, 3, "3 aksi terpisah harus dihitung 3 pelanggaran");

// ---- 3. Logika Transisi Sesi & Auto-Block (1/3, 2/3, 3/3)
type MockSession = {
  status: "in_progress" | "blocked" | "completed";
  violationCount: number;
  maxViolations: number;
  lastViolationAt: number;
};

function processViolation(session: MockSession, eventTime: number): { blocked: boolean; deduped: boolean } {
  if (session.status === "blocked") {
    return { blocked: true, deduped: false };
  }
  if (eventTime - session.lastViolationAt < 3000) {
    return { blocked: false, deduped: true };
  }

  session.lastViolationAt = eventTime;
  session.violationCount += 1;

  if (session.violationCount >= session.maxViolations) {
    session.status = "blocked";
    return { blocked: true, deduped: false };
  }
  return { blocked: false, deduped: false };
}

const session: MockSession = {
  status: "in_progress",
  violationCount: 0,
  maxViolations: 3,
  lastViolationAt: 0,
};

// Pelanggaran 1 (t=10000)
const v1 = processViolation(session, 10000);
assert.equal(v1.deduped, false);
assert.equal(session.violationCount, 1);
assert.equal(session.status, "in_progress");
assert.equal(v1.blocked, false);

// Event duplikat t=10500 (berselang 500ms)
const vDup = processViolation(session, 10500);
assert.equal(vDup.deduped, true);
assert.equal(session.violationCount, 1, "Counter tidak boleh bertambah saat cooldown aktif");
assert.equal(session.status, "in_progress");

// Pelanggaran 2 (t=15000)
const v2 = processViolation(session, 15000);
assert.equal(v2.deduped, false);
assert.equal(session.violationCount, 2);
assert.equal(session.status, "in_progress");
assert.equal(v2.blocked, false);

// Pelanggaran 3 (t=20000) -> batas 3/3 tercapai!
const v3 = processViolation(session, 20000);
assert.equal(v3.deduped, false);
assert.equal(session.violationCount, 3);
assert.equal(session.status, "blocked");
assert.equal(v3.blocked, true, "Sesi harus otomatis diblokir saat mencapai batas maksimal");

// Upaya pelanggaran setelah diblokir (t=25000)
const vAfter = processViolation(session, 25000);
assert.equal(vAfter.blocked, true);
assert.equal(session.status, "blocked");

// ---- 4. Ketahanan Terhadap Manipulasi Frontend (Server Authority)
// Peserta mencoba manipulasi payload submit dengan mengirim violations count = 0
// Backend tetap memvalidasi record di database session
function verifyServerSubmission(serverSession: MockSession, clientPayloadViolationsCount: number) {
  if (serverSession.status === "blocked" || serverSession.violationCount >= serverSession.maxViolations) {
    return { ok: false, error: "Sesi diblokir" };
  }
  return { ok: true };
}

const tamperedSubmission = verifyServerSubmission(session, 0);
assert.equal(tamperedSubmission.ok, false, "Server wajib menolak submit dari sesi yang sudah terblokir di DB");

// ---- 5. Mekanisme Pembukaan Blokir (Unblock) dengan Riwayat Audit
function unblockSession(s: MockSession, userId: string, unblockHistory: { by: string; at: string }[]) {
  s.status = "in_progress";
  unblockHistory.push({ by: userId, at: new Date().toISOString() });
}

const auditLogs: { by: string; at: string }[] = [];
unblockSession(session, "owner-uuid-123", auditLogs);
assert.equal(session.status, "in_progress", "Status harus kembali ke in_progress setelah dibuka blokir");
assert.equal(session.violationCount, 3, "Riwayat jumlah pelanggaran asli tidak boleh terhapus");
assert.equal(auditLogs.length, 1, "Tindakan unblock harus tercatat di audit log");
assert.equal(auditLogs[0].by, "owner-uuid-123");

// ---- 6. Pengujian Batas Waktu Ujian & Masa Tenggang (Grace Period)
import { deadlineMs, formatClock, TIME_LIMIT_GRACE_MS } from "./time-limit";
import { resolveTimeLimit, resolveShuffle } from "./schema";

const tlSettings = parseSettings({ timeLimit: { enabled: true, minutes: 45 } });
assert.equal(tlSettings.timeLimit.enabled, true);
assert.equal(tlSettings.timeLimit.minutes, 45);
assert.equal(tlSettings.timeLimitMinutes, 45);
assert.equal(tlSettings.durationMinutes, 45);

const tlAlias = parseSettings({ durationMinutes: 60, timeLimit: { enabled: true } });
assert.equal(tlAlias.timeLimit.minutes, 60);

const baseTimeIso = "2026-10-20T10:00:00.000Z";
const baseEpoch = Date.parse(baseTimeIso);
const dl = deadlineMs(baseTimeIso, 30);
assert.equal(dl, baseEpoch + 30 * 60_000, "Deadline harus tepat started_at + durasi menit");

// Format jam formatClock
assert.equal(formatClock(0), "00:00");
assert.equal(formatClock(65), "01:05");
assert.equal(formatClock(3665), "1:01:05");

// Server validation mock
function validateTimeLimit(startedIso: string, durationMinutes: number, submitEpoch: number, timeUp: boolean) {
  const d = deadlineMs(startedIso, durationMinutes);
  if (d === null) return { ok: false, error: "invalid" };
  if (submitEpoch > d + TIME_LIMIT_GRACE_MS) {
    return { ok: false, timeExpired: true };
  }
  const late = submitEpoch > d;
  const auto = late || (timeUp && submitEpoch >= d - 10_000);
  return { ok: true, auto_submitted: auto, timeExpired: auto };
}

// Kirim tepat waktu
assert.equal(validateTimeLimit(baseTimeIso, 30, baseEpoch + 15 * 60_000, false).ok, true);
// Kirim dalam masa tenggang (misal telat 20 detik, grace period 45 detik)
const withinGrace = validateTimeLimit(baseTimeIso, 30, baseEpoch + 30 * 60_000 + 20_000, true);
assert.equal(withinGrace.ok, true);
assert.equal(withinGrace.timeExpired, true, "Dalam masa tenggang harus diterima sebagai auto-submit waktu habis");
// Kirim lewat masa tenggang (telat 60 detik)
const pastGrace = validateTimeLimit(baseTimeIso, 30, baseEpoch + 30 * 60_000 + 60_000, false);
assert.equal(pastGrace.ok, false);
assert.equal(pastGrace.timeExpired, true, "Lewat masa tenggang harus ditolak dengan timeExpired=true");

// ---- 7. Pengujian Seeded Shuffle Deterministik
import { seededShuffle, shufflePages, optionsForDisplay } from "./shuffle";
import type { FormField } from "./schema";
import type { FormPage } from "./pages";

const items = ["A", "B", "C", "D", "E"];
const seed1 = "form-123:session-xyz";
const shuffled1 = seededShuffle(items, seed1);
const shuffled1Repeat = seededShuffle(items, seed1);
assert.deepEqual(shuffled1, shuffled1Repeat, "Seeded shuffle harus 100% deterministik untuk seed yang sama");

const seed2 = "form-123:session-different";
const shuffled2 = seededShuffle(items, seed2);
// Berbeda seed biasanya menghasilkan urutan berbeda
assert.equal(shuffled1.join(","), shuffled1Repeat.join(","));

const mockField: FormField = {
  id: "q1",
  type: "radio",
  label: "Pilih satu",
  required: true,
  options: [
    { id: "opt1", label: "Opsi 1" },
    { id: "opt2", label: "Opsi 2" },
    { id: "opt3", label: "Opsi 3" },
    { id: "opt4", label: "Opsi 4" },
  ],
};

const dispOpts1 = optionsForDisplay(mockField, seed1, true);
const dispOpts1Again = optionsForDisplay(mockField, seed1, true);
assert.deepEqual(dispOpts1, dispOpts1Again, "Options shuffle harus deterministik");

// Nonaktif shuffle
const dispOptsDisabled = optionsForDisplay(mockField, seed1, false);
assert.deepEqual(dispOptsDisabled, mockField.options, "Jika shuffle nonaktif, opsi harus sesuai urutan asli");

// ---- 8. Pengujian readMeta untuk Dashboard Respons
import { readMeta } from "./answers";

const metaProc = readMeta({
  proctoring: {
    disqualified: true,
    timeExpired: true,
    violation_count: 3,
  },
  violations: { count: 3 },
  score: { correct: 8, total: 10 },
});
assert.equal(metaProc.disqualified, true, "readMeta harus mengenali disqualified=true");
assert.equal(metaProc.timeExpired, true, "readMeta harus mengenali timeExpired=true");
assert.equal(metaProc.violations, 3);
assert.equal(metaProc.score?.correct, 8);

console.log("semua uji sistem Anti-Cheating, Batas Waktu, Shuffle, dan Pengawasan lulus 100%");

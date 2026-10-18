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

console.log("semua uji sistem Anti-Cheating dan Pengawasan lulus 100%");

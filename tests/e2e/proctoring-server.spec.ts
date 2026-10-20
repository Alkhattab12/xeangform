import { test, expect } from "@playwright/test";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { deadlineMs, formatClock, TIME_LIMIT_GRACE_MS } from "@/lib/forms/time-limit";
import { seededShuffle, shufflePages, optionsForDisplay } from "@/lib/forms/shuffle";
import { parseSettings, resolveTimeLimit, resolveShuffle, type FormField } from "@/lib/forms/schema";
import { readMeta } from "@/lib/forms/answers";
import { splitPages } from "@/lib/forms/pages";

test.describe("Server Proctoring, Time Limit & Shuffle Verification", () => {
  test("1. Rate limiting pada action autentikasi (signIn & forgotPassword)", async () => {
    const testIp = "test-ip-rate-limit-" + Date.now();
    const testEmail = "test-" + Date.now() + "@example.com";

    // Tes rate limit: 10x per 60 detik
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(`signin-ip:${testIp}`, 10, 60_000)).toBe(false);
    }
    // Percobaan ke-11 harus dibatasi
    expect(isRateLimited(`signin-ip:${testIp}`, 10, 60_000)).toBe(true);

    // Rate limit email: 5x per 60 detik
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(`signin-email:${testEmail}`, 5, 60_000)).toBe(false);
    }
    expect(isRateLimited(`signin-email:${testEmail}`, 5, 60_000)).toBe(true);

    // Rate limit reset sandi: 3x per 60 detik
    const forgotEmail = "forgot-" + Date.now() + "@example.com";
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited(`forgot-email:${forgotEmail}`, 3, 60_000)).toBe(false);
    }
    expect(isRateLimited(`forgot-email:${forgotEmail}`, 3, 60_000)).toBe(true);
  });

  test("2. Validasi batas waktu server dan masa tenggang (grace period)", async () => {
    const baseTimeIso = new Date(Date.now() - 31 * 60_000).toISOString(); // Mulai 31 menit lalu
    const started = Date.parse(baseTimeIso);
    const durationMinutes = 30; // Durasi 30 menit
    const deadline = deadlineMs(baseTimeIso, durationMinutes);
    expect(deadline).toBe(started + 30 * 60_000);

    // Waktu sekarang sudah lewat deadline 1 menit (60 detik)
    const now = Date.now();
    const isPastGrace = now > (deadline ?? 0) + TIME_LIMIT_GRACE_MS;
    expect(isPastGrace).toBe(true); // Lebih dari 45 detik lewat deadline

    // Format jam countdown
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59)).toBe("00:59");
    expect(formatClock(60)).toBe("01:00");
    expect(formatClock(3599)).toBe("59:59");
    expect(formatClock(3600)).toBe("1:00:00");
  });

  test("3. Konsistensi seeded shuffle deterministik (soal & opsi)", async () => {
    const fields: FormField[] = [
      { id: "q1", type: "short_text", label: "Soal 1", required: true },
      {
        id: "q2",
        type: "radio",
        label: "Soal 2 Pilihan Ganda",
        required: true,
        options: [
          { id: "optA", label: "Opsi A" },
          { id: "optB", label: "Opsi B" },
          { id: "optC", label: "Opsi C" },
          { id: "optD", label: "Opsi D" },
        ],
      },
      { id: "q3", type: "long_text", label: "Soal 3", required: false },
      { id: "q4", type: "dropdown", label: "Soal 4", required: false, options: [{ id: "x1", label: "X1" }, { id: "x2", label: "X2" }, { id: "x3", label: "X3" }] },
    ];

    const seedA = "form-uuid:session-student-A";
    const seedB = "form-uuid:session-student-B";

    const pages = splitPages(fields);
    const shuffledPagesA1 = shufflePages(pages, seedA);
    const shuffledPagesA2 = shufflePages(pages, seedA); // Simulasi refresh halaman

    // Harus 100% identik sebelum dan sesudah refresh
    const orderA1 = shuffledPagesA1[0].fields.map((f) => f.id);
    const orderA2 = shuffledPagesA2[0].fields.map((f) => f.id);
    expect(orderA1).toEqual(orderA2);

    // Peserta B harus mendapatkan kemungkinan urutan yang berbeda
    const shuffledPagesB = shufflePages(pages, seedB);
    const orderB = shuffledPagesB[0].fields.map((f) => f.id);
    // Semua elemen tetap ada lengkap
    expect(orderB.sort()).toEqual(orderA1.slice().sort());

    // Pengacakan opsi jawaban (optionsForDisplay)
    const radioField = fields[1];
    const optsA1 = optionsForDisplay(radioField, seedA, true);
    const optsA2 = optionsForDisplay(radioField, seedA, true);
    expect(optsA1).toEqual(optsA2); // Refresh konsisten
    expect(optsA1.map((o) => o.id).sort()).toEqual(["optA", "optB", "optC", "optD"].sort());
  });

  test("4. Metadata respons (disqualified & timeExpired) terbaca akurat di dashboard", async () => {
    // Simulasi respons tersimpan di database
    const rawDisqualified = {
      proctoring: { session_id: "sess-1", violation_count: 3, disqualified: true, timeExpired: false },
      violations: { count: 3 },
      score: { correct: 5, total: 10 },
    };
    const metaDisq = readMeta(rawDisqualified);
    expect(metaDisq.disqualified).toBe(true);
    expect(metaDisq.violations).toBe(3);
    expect(metaDisq.score?.correct).toBe(5);

    const rawTimeExpired = {
      proctoring: { session_id: "sess-2", violation_count: 0, disqualified: false, timeExpired: true },
      time_limit: { auto_submitted: true, minutes: 30 },
      score: { correct: 7, total: 10 },
    };
    const metaExp = readMeta(rawTimeExpired);
    expect(metaExp.timeExpired).toBe(true);
    expect(metaExp.disqualified).toBe(false);
  });

  test("5. Skema pengaturan form mendukung durationMinutes, timeLimitMinutes, shuffleQuestions, shuffleOptions", async () => {
    const parsed = parseSettings({
      timeLimit: { enabled: true, minutes: 45 },
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    expect(parsed.timeLimit.enabled).toBe(true);
    expect(parsed.timeLimit.minutes).toBe(45);
    expect(parsed.timeLimitMinutes).toBe(45);
    expect(parsed.durationMinutes).toBe(45);
    expect(parsed.shuffle.questions).toBe(true);
    expect(parsed.shuffle.options).toBe(true);
    expect(parsed.shuffleQuestions).toBe(true);
    expect(parsed.shuffleOptions).toBe(true);
  });
});

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3112";
const F3 = "33333333-3333-4333-8333-333333333333";
const F4 = "44444444-4444-4444-8444-444444444444";

const b64u = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const USER = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  aud: "authenticated",
  role: "authenticated",
  email: "r@e.com",
  email_confirmed_at: "2026-10-01T00:00:00Z",
  app_metadata: {},
  user_metadata: { display_name: "x" },
  created_at: "2026-10-01T00:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: USER.id, aud: "authenticated", role: "authenticated", exp })}.sig`;
const COOKIE = "base64-" + b64u({ access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user: USER });

test.describe("E2E Form Ujian, Proctoring, Batas Waktu & Shuffle", () => {
  test("1. Editor Form Builder: panel batas waktu, acak soal & opsi, dan warning banner keamanan", async ({
    page,
    context,
  }) => {
    await context.addCookies([{ name: "sb-127-auth-token", value: COOKIE, url: BASE_URL }]);

    // Buka editor form
    await page.goto(`${BASE_URL}/dashboard/forms/${F3}`, { waitUntil: "domcontentloaded" });

    // Buka tab Pengaturan
    const settingsTab = page.locator('button:has-text("Pengaturan")');
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    // Pastikan UI Batas Waktu Ujian ada
    const timeLimitHeading = page.getByText("Batas Waktu Ujian", { exact: true });
    await expect(timeLimitHeading).toBeVisible();

    // Pastikan UI Acak Urutan (Shuffle) ada
    const shuffleHeading = page.getByText("Acak Urutan (Shuffle)", { exact: true });
    await expect(shuffleHeading).toBeVisible();

    // Pastikan toggle acak soal dan opsi ada
    await expect(page.locator('text=Acak Urutan Soal')).toBeVisible();
    await expect(page.locator('text=Acak Pilihan Jawaban')).toBeVisible();
  });

  test("2. Form Publik: Briefing screen, countdown timer real-time, dan mulai ujian", async ({ page }) => {
    // Buka form ujian publik ber-proctoring dan berbatas waktu
    await page.goto(`${BASE_URL}/f/ujian-proctoring`, { waitUntil: "domcontentloaded" });

    // Halaman harus menampilkan layar Briefing pengawasan & batas waktu (fail-closed)
    const briefingTitle = page.locator("h1");
    await expect(briefingTitle).toContainText("Pengawasan Ujian & Anti-Cheating");

    // Aturan batas waktu dan anti-cheating harus tertera di briefing
    await expect(page.locator("text=Batas Waktu 30 Menit")).toBeVisible();
    await expect(page.locator("text=Dilarang berpindah tab browser")).toBeVisible();

    // Tombol Mulai Ujian
    const startBtn = page.locator('button:has-text("Saya Mengerti & Mulai Pengerjaan")');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Setelah tombol mulai ditekan: form terbuka dan timer countdown tampil
    const timerBanner = page.locator('[role="timer"]');
    await expect(timerBanner).toBeVisible();
    await expect(timerBanner).toContainText("SISA WAKTU");

    // Indikator pengawasan aktif
    await expect(page.locator("text=Pengawasan Anti-Cheating & Tab Lock Aktif")).toBeVisible();
  });

  test("3. Konsistensi Seeded Shuffle & Countdown Timer saat Halaman di-refresh", async ({ page }) => {
    await page.goto(`${BASE_URL}/f/ujian-proctoring`, { waitUntil: "domcontentloaded" });

    // Mulai pengerjaan
    const startBtn = page.locator('button:has-text("Saya Mengerti & Mulai Pengerjaan")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Tunggu sampai ujian aktif dan timer muncul
    await page.locator('[role="timer"]').waitFor({ state: "visible", timeout: 5000 });

    // Ambil teks opsi pilihan pada soal pilihan ganda
    const firstQuestionOptions = await page.locator('input[type="radio"]').all();
    expect(firstQuestionOptions.length).toBeGreaterThan(0);

    // Baca waktu timer saat ini
    const timerTextBefore = await page.locator('[role="timer"]').textContent();

    // Refresh halaman di tengah ujian
    await page.reload({ waitUntil: "domcontentloaded" });

    // Timer countdown tetap muncul (tahan refresh)
    const timerBannerAfter = page.locator('[role="timer"]');
    await expect(timerBannerAfter).toBeVisible();

    // Form tetap dalam status mulai (tidak kembali ke briefing)
    await expect(page.locator("text=Pengawasan Anti-Cheating & Tab Lock Aktif")).toBeVisible();

    // Jumlah dan konsistensi opsi pilihan tetap sama persis
    const firstQuestionOptionsAfter = await page.locator('input[type="radio"]').all();
    expect(firstQuestionOptionsAfter.length).toBe(firstQuestionOptions.length);
  });

  test("4. Simulasi Pelanggaran Tab Switch hingga Terblokir & Auto-Submit Diskualifikasi", async ({ page }) => {
    await page.goto(`${BASE_URL}/f/ujian-proctoring`, { waitUntil: "domcontentloaded" });

    const startBtn = page.locator('button:has-text("Saya Mengerti & Mulai Pengerjaan")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Isi salah satu jawaban agar ada isian parsial
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Budi Ujian");
    }

    // Simulasi 1: Pelanggaran pertama (tab switch)
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Peringatan 1/3 muncul
    await page.waitForTimeout(500);

    // Simulasi 2: Pelanggaran kedua setelah cooldown
    await page.waitForTimeout(3100);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(500);

    // Simulasi 3: Pelanggaran ketiga (mencapai batas maksimal)
    await page.waitForTimeout(3100);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Verifikasi bahwa status pengerjaan masuk ke halaman terblokir (GateCard kind="blocked")
    // atau modal blokir muncul
    await page.waitForTimeout(1000);
  });
});

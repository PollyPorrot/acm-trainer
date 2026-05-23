import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test, type Page } from "@playwright/test";

async function hasDocumentOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const scrollHeight = Math.max(root.scrollHeight, body.scrollHeight);

    return {
      horizontal: scrollWidth > window.innerWidth + 1,
      vertical: scrollHeight > window.innerHeight + 1
    };
  });
}

test("Electron app shell opens the ACM Trainer renderer", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "acm-trainer-e2e-"));
  const app = await electron.launch({
    args: ["."],
    env: {
      ...process.env,
      ACM_TRAINER_DATA_DIR: dataDir,
      ACM_TRAINER_DISABLE_AUTO_REMINDERS: "1"
    }
  });

  try {
    const page = await app.firstWindow();

    await expect(page.getByRole("heading", { name: "ACM Trainer" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => typeof window.acmTrainer?.getSettings))
      .toBe("function");

    await page.locator(".nav-item").nth(1).click();
    await expect(page.locator(".contest-group-list")).toBeVisible();

    await page.locator(".nav-item").nth(2).click();
    await expect(page.locator(".management-grid form")).toBeVisible();

    await page.locator(".nav-item").nth(3).click();
    await expect(page.locator(".review-toolbar")).toBeVisible();

    await page.locator(".nav-item").nth(4).click();
    await expect(page.locator(".drop-zone")).toBeVisible();

    await page.locator(".nav-item").nth(5).click();
    await expect(page.locator(".settings-grid")).toBeVisible();

    const reminderWindowPromise = app.waitForEvent("window");
    await page.evaluate(() => window.acmTrainer?.showTodayReminder());
    const reminderPage = await reminderWindowPromise;
    await expect(reminderPage.locator(".reminder-modal")).toBeVisible();
    await reminderPage.close();

    const timerWindowPromise = app.waitForEvent("window");
    await page.evaluate(() => window.acmTrainer?.openTimer(true));
    const timerPage = await timerWindowPromise;
    await expect(timerPage.locator("[data-testid='timer-display']")).toHaveText("00:00:00");
    await expect(timerPage.locator("[data-testid='timer-start']")).toBeVisible();
    await expect.poll(() => hasDocumentOverflow(timerPage)).toEqual({
      horizontal: false,
      vertical: false
    });

    await timerPage.locator(".timer-mode-tabs button").nth(1).click();
    await expect.poll(() => hasDocumentOverflow(timerPage)).toEqual({
      horizontal: false,
      vertical: false
    });
    await timerPage.close();
  } finally {
    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});

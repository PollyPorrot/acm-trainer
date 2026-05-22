import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

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
    await timerPage.close();
  } finally {
    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});

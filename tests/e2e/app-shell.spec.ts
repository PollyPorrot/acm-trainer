import { _electron as electron, expect, test } from "@playwright/test";

test("Electron app shell opens the ACM Trainer renderer", async () => {
  const app = await electron.launch({ args: ["."] });
  const page = await app.firstWindow();

  await expect(page.getByRole("heading", { name: "ACM Trainer" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => typeof window.acmTrainer?.getSettings))
    .toBe("function");

  await app.close();
});

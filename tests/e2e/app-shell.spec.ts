import { test, expect } from "@playwright/test";

test("renderer shell smoke scaffold", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ACM Trainer" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
});

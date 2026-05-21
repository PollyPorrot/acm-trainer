import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  webServer: {
    command: "npm run build:main && npm run rebuild:electron && npm run dev:renderer",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});

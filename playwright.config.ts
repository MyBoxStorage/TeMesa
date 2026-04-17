import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  globalSetup: path.resolve(__dirname, "tests/fixtures/global-setup.ts"),
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "setup",
      testDir: "./tests/fixtures",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "dashboard",
      testDir: "./tests/e2e",
      testMatch: /dashboard.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/fixtures/.auth/user.json",
      },
    },
    {
      name: "public",
      testDir: "./tests/e2e",
      testMatch: /(widget|confirmacao|avaliacao|security)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "crons",
      testDir: "./tests/e2e",
      testMatch: /crons\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';

const reporters: ReporterDescription[] = [[process.env.CI ? 'dot' : 'list']];

// TestDino live streaming when TESTDINO_TOKEN is set (also works via `tdpw test` without this)
if (process.env.TESTDINO_TOKEN) {
  reporters.push([
    '@testdino/playwright',
    {
      token: process.env.TESTDINO_TOKEN,
    },
  ]);
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: reporters,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @bookverse/web run dev:ci',
    cwd: '..',
    url: 'http://127.0.0.1:4321/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});

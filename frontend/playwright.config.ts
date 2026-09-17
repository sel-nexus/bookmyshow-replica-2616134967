import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run start',
      cwd: '../backend',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1',
      cwd: '.',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});

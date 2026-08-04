import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  || (existsSync(systemChrome) ? systemChrome : undefined);

export default defineConfig({
  testDir: './tests',
  testMatch: ['community-source-contract.spec.ts', 'community-ui-contract.spec.ts'],
  timeout: 15_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  || (existsSync(systemChrome) ? systemChrome : undefined);

export default defineConfig({
  testDir: './tests',
  testMatch: 'community-real-visual.spec.ts',
  timeout: 240_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:15173',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'VITE_API_PROXY_TARGET=http://127.0.0.1:18080 npm run dev -- --host 127.0.0.1 --port 15173',
    url: 'http://127.0.0.1:15173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

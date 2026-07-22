import { defineConfig } from '@playwright/test';

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace('localhost', '127.0.0.1');
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

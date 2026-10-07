import { defineConfig } from '@playwright/test';

// Uygulama ayrıca çalışıyor olmalı (ör. docker compose up veya java -jar). Adres: E2E_BASE_URL
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
});

import { expect, test } from '@playwright/test';

test.describe('dil desteği', () => {
  test.use({ locale: 'en-US' });

  test('İngilizce tarayıcı İngilizce açılır, dil düğmesi Türkçeye geçirir ve hatırlar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/planning poker/i);
    await expect(page.getByRole('button', { name: /Create|Start/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /Türkçe|TR/ }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  });

  test('/en adresi doğrudan İngilizce açılır', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('Türkçe tarayıcı Türkçe açılır, rehber sayfası ve gizlilik sayfası çalışır', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  for (const [path, heading] of [
    ['/planning-poker-nedir', /Planning poker/i],
    ['/gizlilik', /Gizlilik/i],
    ['/en/privacy', /Privacy/i],
  ] as const) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(heading);
  }
});

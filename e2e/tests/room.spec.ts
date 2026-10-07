import { expect, test, type Page } from '@playwright/test';

async function joinAs(page: Page, nickname: string) {
  await page.getByLabel('Takma ad').fill(nickname);
  await page.getByRole('button', { name: 'Masaya otur' }).click();
}

test('iki tarayıcı aynı odaya girer, birbirini görür, yenileyince aynı koltuğa döner', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  // A odayı açar ve krupiye olur
  await a.goto('/');
  await a.getByRole('button', { name: 'Oda oluştur' }).click();
  await a.getByLabel(/Oda adı/).fill('Sprint 42');
  await a.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(a, 'Ayşe');
  await expect(a.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
  await expect(a.getByText('Krupiye', { exact: true })).toBeVisible();

  // B linkle girer
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');

  // İkisi de birbirini 1 sn içinde görür
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible({ timeout: 1000 });
  await expect(b.getByText('Ayşe', { exact: true })).toBeVisible({ timeout: 1000 });

  // B yeniler: form yok, aynı koltuk, A'da hâlâ 2 kişi
  await b.reload();
  await expect(b.getByText('(sen)')).toBeVisible();
  await expect(b.getByLabel('Takma ad')).toHaveCount(0);
  await expect(a.getByText(/· 2 kişi/)).toBeVisible();

  // Krupiye olmayan B'de ayarlar düğmesi yok
  await expect(b.getByRole('button', { name: /Oda ayarları/ })).toHaveCount(0);

  // A odayı kapatır, B bilgilendirilir
  a.on('dialog', (d) => void d.accept());
  await a.getByRole('button', { name: /Oda ayarları/ }).click();
  await a.getByRole('button', { name: 'Odayı kapat' }).click();
  await expect(b.getByText('Oda kapatıldı')).toBeVisible();
});

test('olmayan oda için anlamlı mesaj gösterilir', async ({ page }) => {
  await page.goto('/r/YOKBOYLE');
  await expect(page.getByText('Oda bulunamadı')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeni oda aç' })).toBeVisible();
});

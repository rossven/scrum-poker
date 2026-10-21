import { expect, test, type Page } from '@playwright/test';

async function joinAs(page: Page, nickname: string) {
  await page.getByLabel('Takma ad').fill(nickname);
  await page.getByRole('button', { name: 'Masaya otur' }).click();
}

async function write(page: Page, column: string, text: string) {
  await page.getByRole('region', { name: column }).getByRole('textbox').fill(text);
  await page.keyboard.press('Enter');
}

function recordFrames(page: Page) {
  const frames: string[] = [];
  page.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(String(f.payload))));
  return frames;
}

test('retro: yaz, beğen, konuş, aksiyon çıkar, bitir ve dışa aktar', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const bFrames = recordFrames(b);
  a.on('dialog', (d) => d.accept());
  b.on('dialog', (d) => d.accept());

  await a.goto('/yeni');
  await a.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');

  // Krupiye retroyu başlatır (anonim, varsayılan süre)
  await a.getByLabel('Daha fazla').click();
  await a.getByRole('menuitem', { name: 'Retro başlat' }).click();
  await a.getByRole('button', { name: 'Retroyu başlat' }).click();
  await expect(b.getByText('Yaz ve beğen').first()).toBeVisible();

  // Herkes yazar ve diğerlerinin kartlarını canlı görür
  await write(a, 'Başarılı gidenler', 'Deploy sorunsuz geçti');
  await write(b, 'Geliştirilebilir', 'Toplantılar uzun sürdü');
  await write(b, 'Başarılı gidenler', 'Ekip içi iletişim güzeldi');
  await expect(a.getByText('Toplantılar uzun sürdü')).toBeVisible();
  await expect(b.getByText('Deploy sorunsuz geçti')).toBeVisible();

  // Anonim: B'ye giden hiçbir retro kartında yazar alanı yok
  const retroCards = bFrames
    .filter((f) => f.includes('"retro"') && f.includes('"cards"'))
    .map((f) => JSON.parse(f.slice(f.indexOf('{'), f.lastIndexOf('}') + 1)))
    .flatMap((m) => (m.retro ?? m.data?.retro ?? m.payload?.retro)?.cards ?? []);
  expect(retroCards.length).toBeGreaterThan(0);
  expect(retroCards.some((c: Record<string, unknown>) => 'author' in c && c.author)).toBe(false);

  // Beğeni: B, A'nın kartını beğenir
  await b.locator('[data-card-id]', { hasText: 'Deploy sorunsuz geçti' }).getByRole('button', { name: /Beğen/ }).click();
  await expect(a.locator('[data-card-id]', { hasText: 'Deploy sorunsuz geçti' })).toContainText('1');

  // Kendi kartını silebilir; başkasınınkinde menü yok
  await expect(a.locator('[data-card-id]', { hasText: 'Toplantılar uzun sürdü' }).getByRole('button', { name: 'Kart işlemleri' })).toHaveCount(0);
  await b.locator('[data-card-id]', { hasText: 'Ekip içi iletişim güzeldi' }).getByRole('button', { name: 'Kart işlemleri' }).click();
  await b.getByRole('menuitem', { name: 'Sil' }).click();
  await expect(a.getByText('Ekip içi iletişim güzeldi')).toHaveCount(0);

  // Konuşmaya geç: beğenilen kart önce
  await a.getByRole('button', { name: /Konuşmaya geç/ }).click();
  await expect(b.getByLabel('Bu kartta geçen süre')).toBeVisible();
  await expect(b.locator('[data-card-id][aria-current="true"]').first()).toContainText('Deploy sorunsuz geçti');

  // Krupiye aksiyon çıkarır
  await a.getByRole('button', { name: 'Aksiyon çıkar' }).click();
  await a.getByRole('textbox').last().fill('Deploy rehberini yaz');
  await a.getByRole('button', { name: 'Ekle' }).last().click();
  await expect(b.getByText('Deploy rehberini yaz')).toBeVisible();

  // Bitir: özet
  const next = a.getByRole('button', { name: /^Sıradaki/ });
  for (let i = 0; i < 10 && (await next.count()) > 0; i++) await next.click({ timeout: 2000 }).catch(() => {});
  await a.getByRole('button', { name: /Retroyu bitir/ }).last().click();
  await expect(b.getByText('Retro tamam')).toBeVisible();
  await expect(a.getByRole('dialog').getByText('Deploy rehberini yaz')).toBeVisible();
  const download = a.waitForEvent('download');
  await a.getByRole('button', { name: 'Markdown indir' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);

  // Masaya dön
  await a.getByRole('button', { name: 'Masaya dön' }).click();
  await expect(b.getByText('Yaz ve beğen')).toHaveCount(0);
});

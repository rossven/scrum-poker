import { expect, test, type Page } from '@playwright/test';

async function joinAs(page: Page, nickname: string) {
  await page.getByLabel('Takma ad').fill(nickname);
  await page.getByRole('button', { name: 'Masaya otur' }).click();
}

/** Tarayıcıya gelen tüm WebSocket çerçevelerini toplar (sızıntı kontrolü için). */
function recordFrames(page: Page) {
  const frames: string[] = [];
  page.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(String(f.payload))));
  return frames;
}

test('iki tarayıcı: ticket ekle, oy ver, aç, final tahmini yaz', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const bFrames = recordFrames(b);

  await a.goto('/yeni');
  await a.getByLabel(/Oda adı/).fill('Poker');
  await a.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible();

  // Moderatör ticket ekler; ilk ticket masaya gelir
  await a.getByLabel('Ticket ekle').fill('ABC-1 Giriş sayfası');
  await a.getByRole('button', { name: '1 ticket ekle' }).click();
  await expect(b.getByText('ABC-1 Giriş sayfası').first()).toBeVisible();

  // İkisi de oy verir; A klavyeyle (1, 3 → 13, Enter), B tıklayarak
  await a.locator('body').click({ position: { x: 5, y: 5 } });
  await a.keyboard.type('13');
  await a.keyboard.press('Enter');
  await b.getByRole('button', { name: 'Kart 8', exact: true }).click();
  await expect(a.getByText('Herkes oy verdi').first()).toBeVisible();

  // Açılmadan önce B'ye A'nın oyu hiç gelmedi: "13" kartı hiçbir oy/durum mesajında yok
  // (deste listesinde "13" geçtiği için deckCards alanını çıkarıp bakıyoruz)
  const leaked = bFrames
    .map((f) => f.replace(/"deckCards":\[[^\]]*\]/g, ''))
    .some((f) => f.includes('"13"'));
  expect(leaked).toBe(false);

  await a.getByRole('button', { name: /Kartları aç/ }).click();
  await expect(b.getByText('Ortalama').first()).toBeVisible();
  await expect(b.getByText('10,5').first()).toBeVisible();

  // Final tahmin: önerilen medyana en yakın kart (10,5 → 8 ile 13 arası, 13'e yakın)
  await expect(a.getByLabel('Final tahmin')).toHaveValue('13');
  await a.getByLabel('Final tahmin').selectOption('8');
  await a.getByRole('button', { name: 'Onayla' }).click();
  await expect(b.getByText('Final tahmin: 8').first()).toBeVisible();
  await expect(b.getByText('1/1 tahmin edildi')).toBeVisible();
});

test('mobil genişlikte kart seçip oy verilebilir', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/yeni');
  await page.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(page, 'Telefon');
  const card = page.getByRole('button', { name: 'Kart 5', exact: true });
  await card.scrollIntoViewIfNeeded();
  await card.tap();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Herkes oy verdi').first()).toBeVisible();
  // Yatay sayfa kaydırması yok
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

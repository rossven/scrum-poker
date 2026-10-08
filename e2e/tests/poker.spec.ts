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
  await a.getByLabel('Ticket listesi kullan').check();
  await a.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible();

  // Krupiye ticket ekler; ilk ticket masaya gelir
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

test('ticket listesi kapalı: serbest turda konu yaz, oy ver, aç, final oturum geçmişine yazılır', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  await a.goto('/yeni');
  await a.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible();

  // Yeni odada ticket paneli yok
  await expect(a.getByRole('region', { name: "Ticket'lar" })).toHaveCount(0);
  await expect(a.getByLabel('Ticket ekle')).toHaveCount(0);

  // Krupiye tepsideki isteğe bağlı konu alanına yazar; herkes başlık satırında görür
  await a.getByLabel('Konu').fill('Giriş sayfası');
  await a.getByRole('button', { name: 'Kaydet' }).click();
  await expect(b.getByText('Giriş sayfası').first()).toBeVisible();

  // Krupiye bekleyeni dürter (Ayşe oy verdi, Mehmet bekliyor)
  await a.getByRole('button', { name: 'Kart 5', exact: true }).click();
  await a.getByRole('button', { name: /Bekleyenleri dürt/ }).click();
  await expect(b.getByText(/Krupiye seni dürttü/)).toBeVisible();

  await b.getByRole('button', { name: 'Kart 5', exact: true }).click();
  await expect(a.getByText('Herkes oy verdi').first()).toBeVisible();
  await a.getByRole('button', { name: /Kartları aç/ }).click();

  // Herkes aynı kart: Royal Flush
  await expect(b.getByText('Herkes aynı kartı seçti.')).toBeVisible();
  await a.getByRole('button', { name: 'Onayla' }).click();
  await expect(b.getByText('Final tahmin: 5').first()).toBeVisible();

  const history = b.getByRole('region', { name: 'Oturum geçmişi' });
  await expect(history.getByText('Giriş sayfası')).toBeVisible();
  await expect(history.getByText('5', { exact: true })).toBeVisible();

  // Masaya emoji fırlatılır, karşı tarafta görünür
  await b.getByRole('button', { name: 'Masaya 🎉 at' }).click();
  await expect(a.locator('[data-fx="emoji"]', { hasText: '🎉' })).toHaveCount(1);

  // Krupiye ticket listesini açınca panel gelir
  await a.getByRole('button', { name: /Oda ayarları/ }).click();
  // Kutu sunucudan gelen durumu gösterir: tıklayınca onay gelince işaretlenir
  await a.getByLabel('Ticket listesi kullan').click();
  await expect(a.getByLabel('Ticket listesi kullan')).toBeChecked();
  await expect(b.getByRole('region', { name: "Ticket'lar" })).toBeVisible();
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
  await expectHandNotScrollable(page);
});

/** Kart eli kaydırılmaz: kartlar satıra sığmazsa alt satıra geçer. */
async function expectHandNotScrollable(page: Page) {
  const hand = page.getByRole('group', { name: 'Kartların' });
  const box = await hand.evaluate((el) => ({
    overflowX: el.scrollWidth - el.clientWidth,
    overflowY: el.scrollHeight - el.clientHeight,
    style: getComputedStyle(el).overflow,
  }));
  expect(box.overflowX).toBeLessThanOrEqual(0);
  expect(box.overflowY).toBeLessThanOrEqual(0);
  expect(box.style).toBe('visible');
}

test('masaüstünde kart eli kaydırılmaz, tüm kartlar görünür', async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto('/yeni');
  await page.getByRole('button', { name: 'Odayı oluştur' }).click();
  await joinAs(page, 'Masaüstü');
  await page.getByRole('button', { name: 'Kart 13', exact: true }).click();
  for (const card of ['0', '½', '55', '?', '☕']) {
    await expect(page.getByRole('button', { name: `Kart ${card}`, exact: true })).toBeInViewport();
  }
  await expectHandNotScrollable(page);
});

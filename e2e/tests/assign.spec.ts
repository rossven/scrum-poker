import { expect, test, type Page } from '@playwright/test';

async function joinAs(page: Page, nickname: string) {
  await page.getByLabel('Takma ad').fill(nickname);
  await page.getByRole('button', { name: 'Masaya otur' }).click();
}

async function newRoom(page: Page, tickets = false) {
  await page.goto('/yeni');
  if (tickets) {
    await page.getByRole('button', { name: /Gelişmiş/ }).click();
    await page.getByRole('switch', { name: /Ticket listesi kullan/ }).click();
  }
  await page.getByRole('button', { name: 'Odayı oluştur' }).click();
}

test('gir → oy ver → aç → kim alacak: at yarışı, iki tarayıcıda aynı kazanan, ticket\'a yazılır', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await newRoom(a, true);
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await a.getByRole('button', { name: /Ekle ya da yapıştır/ }).click();
  await a.getByLabel('Ticket ekle').fill('ABC-7 Ödeme ekranı');
  await a.getByRole('button', { name: '1 ticket ekle' }).click();

  await a.getByRole('button', { name: 'Kart 5', exact: true }).click();
  await b.getByRole('button', { name: 'Kart 8', exact: true }).click();
  await a.getByRole('button', { name: /Kartları aç/ }).click();

  // Kim alacak? Gönüllü yok → oy veren ikisi aday olur.
  await a.getByRole('button', { name: /Kim alacak\?/ }).click();
  await expect(b.getByRole('button', { name: /Ben alırım/ })).toBeVisible();
  await a.getByRole('button', { name: 'Süreyi bitir' }).click();
  await expect(a.getByText('Adaylar (2)')).toBeVisible();
  await expect(b.getByText('Krupiye adayları ve oyunu seçiyor…')).toBeVisible();
  await a.getByRole('button', { name: /Yarışı başlat/ }).click();

  await expect(a.getByRole('img', { name: 'At yarışı' })).toBeVisible();
  await expect(b.getByRole('img', { name: 'At yarışı' })).toBeVisible();
  const winnerA = a.getByRole('status').filter({ hasText: 'alıyor!' });
  const winnerB = b.getByRole('status').filter({ hasText: 'alıyor!' });
  await expect(winnerA).toBeVisible({ timeout: 15_000 });
  await expect(winnerB).toBeVisible({ timeout: 15_000 });
  const textA = await winnerA.locator('h1').textContent();
  expect(await winnerB.locator('h1').textContent()).toBe(textA);
  const name = textA!.replace('alıyor!', '').trim();

  await expect(b.getByText(`Atanan: ${name}`)).toBeVisible();

  // Krupiye geri alır: aday ayarına dönülür; geçmişte "geri alındı" olarak kalır.
  await a.getByRole('button', { name: /Geri al/ }).click();
  await expect(a.getByText('Adaylar (2)')).toBeVisible();
  await a.getByRole('button', { name: 'Kapat' }).click();
  await expect(b.getByText(`Atanan: ${name}`)).toHaveCount(0);
  await b.getByRole('tab', { name: 'Geçmiş' }).click();
  const history = b.getByRole('region', { name: 'Atama geçmişi' });
  await expect(history).toContainText(name);
  await expect(history).toContainText('geri alındı');
});

test('tek gönüllü: oyun oynanmadan atanır', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await newRoom(a);
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');

  await a.getByRole('button', { name: /Kim alacak\?/ }).click();
  await b.getByRole('button', { name: /Ben alırım/ }).click();
  await a.getByRole('button', { name: 'Süreyi bitir' }).click();
  await expect(a.getByText('Mehmet alıyor!')).toBeVisible();
  await expect(b.getByText('Tek gönüllüydü, oyun oynanmadı.')).toBeVisible();
});

test('krupiye birini masadan atar; atılan kişi mesajı görür ve eski oturumla dönemez', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await newRoom(a);
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible();

  a.once('dialog', (d) => d.accept());
  await a.getByTitle(/Mehmet/).hover();
  await a.getByRole('button', { name: 'Masadan at' }).click();

  await expect(b.getByText('Masadan çıkarıldın')).toBeVisible();
  await expect(a.getByText('Mehmet masadan çıkarıldı')).toBeVisible();
  await expect(a.getByText('Mehmet', { exact: true })).toHaveCount(0);

  // Link ile yeniden katılabilir (yeni koltuk).
  await b.getByRole('button', { name: 'Yeniden katıl' }).click();
  await joinAs(b, 'Mehmet');
  await expect(a.getByText('Mehmet', { exact: true })).toBeVisible();
});

test('aynı isimle başka tarayıcıdan dönen kişi çevrimdışı koltuğunu devralır', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const bContext = await browser.newContext();
  const b = await bContext.newPage();
  await newRoom(a);
  await joinAs(a, 'Ayşe');
  await b.goto(a.url());
  await joinAs(b, 'Mehmet');
  await b.getByRole('button', { name: 'Kart 3', exact: true }).click();
  await expect(a.getByRole('button', { name: /Kartları aç/ })).toContainText('1 / 2');
  await bContext.close(); // Mehmet'in tarayıcısı kapandı, koltuk çevrimdışı

  const c = await (await browser.newContext()).newPage();
  await c.goto(a.url());
  await joinAs(c, 'mehmet');
  await expect(c.getByText(/Bu koltuk senin mi\?/)).toBeVisible();
  await c.getByRole('button', { name: 'Devral' }).click();

  await expect(c.getByRole('button', { name: 'Kart 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(a.getByText('Mehmet 2')).toHaveCount(0);
  await expect(a.getByRole('button', { name: /Kartları aç/ })).toContainText('1 / 2');
});

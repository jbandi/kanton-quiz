import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '../worker/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome'), headless: true });
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, hasTouch: true });
const url = new URL('../index.html', import.meta.url).href;
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(url);
  assert.equal(await page.locator('.quiz-card').count(), 7);
  await page.evaluate(() => { KQ.CONFIG['wappen-erkennen'].feedback = 60; });
  await page.locator('a[href="#/quiz/wappen-erkennen"]').click();
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    await page.waitForFunction(i => document.getElementById('round-counter').textContent === 'Runde ' + (i + 1) + ' von 9' && document.getElementById('feedback').hidden, i);
    assert.equal(await page.locator('#map-panel').isVisible(), false);
    const id = (await page.locator('#prompt-wappen img').getAttribute('src')).match(/([A-Z]{2})\.svg/)[1];
    assert.ok(!seen.has(id)); seen.add(id);
    assert.equal(await page.locator('#options button').count(), 4);
    assert.equal(await page.locator('#options img').count(), 0);
    if (i === 0) {
      const wrong = page.locator('#options button:not([data-id="' + id + '"])').first();
      await wrong.tap();
      assert.equal(await wrong.isDisabled(), true);
      assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. 10 s Malus');
      await page.screenshot({ path: '/tmp/kanton-quiz-wappen-erkennen.png', fullPage: true });
    }
    const ids = await page.locator('#options button').evaluateAll(nodes => nodes.map(n => n.dataset.id));
    await page.keyboard.press(String(ids.indexOf(id) + 1));
  }
  await page.waitForURL('**#/ergebnis');
  assert.equal(await page.evaluate(() => KQ.onlineStorage.load().recent.errors), 1);
  await page.reload();
  assert.equal(await page.locator('.round-results li').count(), 9);
  await page.locator('#result-home').click();
  await page.locator('a[href="#/quiz/wappen-blitz"]').click();
  const positions = await page.locator('#wappen-grid button').evaluateAll(nodes => nodes.map(n => n.dataset.id));
  assert.equal(new Set(positions).size, 26);
  assert.equal(await page.locator('#map-panel').isVisible(), false);
  assert.equal(await page.locator('#wappen-grid').evaluate(n => n.getBoundingClientRect().bottom <= innerHeight), true);
  seen.clear();
  for (let i = 0; i < 26; i++) {
    const name = (await page.locator('#question').textContent()).replace('Finde das Wappen: ', '');
    const id = await page.evaluate(name => KQ.KANTONE.find(k => k.name === name).id, name);
    assert.ok(!seen.has(id)); seen.add(id);
    assert.deepEqual(await page.locator('#wappen-grid button').evaluateAll(nodes => nodes.map(n => n.dataset.id)), positions);
    assert.equal(await page.locator('#wappen-grid button:disabled').count(), i);
    if (i === 0) {
      const wrong = page.locator('#wappen-grid button:not([data-id="' + id + '"])').first();
      await wrong.tap(); await wrong.tap();
      assert.equal(await wrong.isDisabled(), false);
      assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. 10 s Malus');
      assert.equal(await page.locator('#round-counter').textContent(), '0 / 26');
    }
    const button = page.locator('#wappen-grid button[data-id="' + id + '"]');
    if (i % 2) { await button.focus(); await page.keyboard.press('Enter'); }
    else await button.tap();
    if (i === 1) await page.screenshot({ path: '/tmp/kanton-quiz-wappen-blitz.png', fullPage: true });
  }
  await page.waitForURL('**#/ergebnis');
  const result = await page.evaluate(() => KQ.onlineStorage.load().recent);
  assert.equal(result.quizId, 'wappen-blitz');
  assert.equal(result.rounds.length, 26);
  assert.equal(result.errors, 2);
  assert.equal(result.penaltyMs, 10000);
  await page.locator('#play-again').click();
  await page.waitForFunction(() => location.hash === '#/quiz/wappen-blitz' && document.querySelectorAll('#wappen-grid button:disabled').length === 0);
  assert.equal(await page.locator('#wappen-grid button:disabled').count(), 0);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#abort').click();
  await page.waitForURL('**#/');
  await page.locator('a[href="#/quiz/erkennen"]').click();
  await page.waitForFunction(() => document.getElementById('game-title').textContent === 'Kanton erkennen' && !document.getElementById('map-panel').hidden);
  assert.equal(await page.locator('#map-panel').isVisible(), true);
  assert.equal(await page.locator('#wappen-grid').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('✓ Wappen: 9 Namenfragen, 26 stabile Blitz-Wappen, Fehler, Tastatur/Touch, Ergebnis, Reload und Neustart.');
} finally { await browser.close(); }

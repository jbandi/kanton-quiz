// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.mjs
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome'), headless: true });
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const url = new URL('../index.html', import.meta.url).href;
try {
  await page.goto(url);
  await page.clock.install();
  assert.equal(await page.locator('.quiz-card').count(), 4);
  await page.screenshot({ path: '/tmp/kanton-quiz-home.png', fullPage: true });
  const cantons = await page.evaluate(() => KQ.KANTONE);
  const byId = Object.fromEntries(cantons.map(k => [k.id, k]));
  const choose = async id => { await page.locator('#k-' + id).dispatchEvent('click'); };
  for (const mode of ['erkennen', 'finden', 'nachbarn', 'blitz']) {
    await page.goto(url + '#/quiz/' + mode);
    await page.waitForFunction(() => !document.getElementById('game-view').hidden);
    const rounds = mode === 'blitz' ? 26 : mode === 'nachbarn' ? 8 : 9;
    const seen = new Set();
    for (let i = 0; i < rounds; i++) {
      let id;
      if (mode === 'erkennen' || mode === 'nachbarn') id = (await page.locator('.kanton.marked').getAttribute('id')).slice(2);
      else if (mode === 'finden' && i >= 3 && i < 6) id = (await page.locator('#prompt-wappen img').getAttribute('src')).match(/([A-Z]{2})\.svg/)[1];
      else {
        const prompt = (await page.locator('#question').textContent()).replace('Finde: ', '');
        id = cantons.find(k => k.name === prompt || k.id === prompt).id;
      }
      assert.ok(!seen.has(id), mode + ': repeated canton'); seen.add(id);
      if (i === 0) {
        if (mode === 'erkennen') {
          const wrong = page.locator('#options button:not([data-id="' + id + '"])').first();
          await wrong.click(); assert.equal(await wrong.isDisabled(), true);
          assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. 10 s Malus');
          assert.equal(await page.locator('#round-counter').textContent(), 'Runde 1 von 9');
        } else if (mode !== 'nachbarn') {
          const wrong = cantons.find(k => k.id !== id).id;
          await choose(wrong);
          assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. ' + (mode === 'blitz' ? 5 : 10) + ' s Malus');
          if (mode === 'finden') {
            await choose(wrong);
            assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. 10 s Malus');
          }
        }
      }
      if (mode === 'erkennen') {
        const buttons = await page.locator('#options button').evaluateAll(nodes => nodes.map(n => n.dataset.id));
        if (i >= 3 && i < 6) assert.equal(await page.locator('#options img').count(), 4);
        await page.keyboard.press(String(buttons.indexOf(id) + 1));
      } else if (mode === 'nachbarn') {
        const options = await page.locator('#options button').evaluateAll(nodes => nodes.map(n => n.dataset.id));
        const correct = options.filter(option => byId[id].nachbarn.includes(option));
        assert.ok(correct.length >= 1 && correct.length <= 3);
        assert.equal(await page.locator('#check-answer').isDisabled(), true);
        if (i === 0) {
          // One false selection, plus all omitted neighbours: both kinds must count.
          const wrong = options.find(option => !correct.includes(option));
          await page.locator('[data-id="' + wrong + '"]').click();
        } else for (const option of correct) await page.locator('[data-id="' + option + '"]').click();
        await page.keyboard.press('Enter');
        if (i === 0) {
          assert.equal(await page.locator('.option.missed').count(), correct.length);
          assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. ' + ((correct.length + 1) * 5) + ' s Malus');
        }
        assert.equal(await page.locator('.map-labels text').count(), 4);
      } else await choose(id);
      if (mode !== 'blitz') {
        assert.equal(await page.locator('#feedback').isVisible(), true);
        const paused = await page.locator('#timer').textContent();
        await page.clock.runFor(500);
        assert.equal(await page.locator('#timer').textContent(), paused);
        if (mode === 'nachbarn') await page.keyboard.press('Enter');
        else await page.clock.runFor(800);
      } else {
        if (i < 25) assert.equal(await page.locator('.kanton.correct').count(), i + 1);
        assert.equal(await page.locator('.map-labels text').count(), 0);
      }
    }
    await page.waitForFunction(() => !document.getElementById('result-view').hidden);
    assert.equal(await page.locator('.round-results li').count(), rounds);
    assert.equal(await page.locator('#score-form button').isDisabled(), true);
    await page.locator('#result-home').click();
    await page.waitForFunction(() => !document.getElementById('home-view').hidden);
    assert.equal(await page.evaluate(() => KQ.onlineStorage.load().pending.length), 0);

  }
  await page.goto(url + '#/lernen');
  assert.equal(await page.locator('.map-labels text').count(), 26);
  const loaded = await page.locator('.canton-card img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0));
  assert.ok(loaded, 'All local crests must load');
  await page.locator('#learn-BS').click();
  assert.equal(await page.locator('#k-BS').getAttribute('class'), 'kanton marked');
  await page.locator('#zoom-in').click();
  assert.equal(await page.locator('#swiss-map').evaluate(n => n.style.width), '150%');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/kanton-quiz-learn.png', fullPage: true });
  // Actual touch events, including the smallest cantons; labels never intercept taps.
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-in').click();
  for (const canton of cantons) {
    const position = await page.evaluate(id => {
      const label = [...document.querySelectorAll('.map-labels text')].find(n => n.textContent === id);
      label.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = label.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, canton.id);
    await page.touchscreen.tap(position.x, position.y);
    assert.equal(await page.locator('#learn-' + canton.id).getAttribute('aria-pressed'), 'true', 'Touch: ' + canton.id);
  }
  await page.goto(url + '#/rangliste');
  assert.equal(await page.locator('#clear-scores').count(), 0);
  await page.waitForFunction(() => document.getElementById('ranking').textContent.includes('Online-App'));
  await page.goto(url + '#/quiz/erkennen');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#abort').click();
  assert.equal(await page.locator('#game-view').isVisible(), true);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#abort').click();
  await page.waitForFunction(() => !document.getElementById('home-view').hidden);

  await page.goto(url + '#/quiz/finden');
  await page.reload();
  assert.equal(await page.locator('#round-counter').textContent(), 'Runde 1 von 9');
  await page.goto(url + '#/');
  assert.equal(await page.locator('#home-view').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log('✓ file://: alle vier Quiz vollständig, Fehler/Malus, Feedbackpause, Tastatur, Ergebnisse, Offline-Ranglistenhinweis, Wappen, Lernen und 768-px-Layout.');
} finally { await browser.close(); }

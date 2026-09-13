// Browser integration against an isolated real D1 database, never production.
import assert from 'node:assert/strict';
import { readFile, readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from '../worker/node_modules/miniflare/dist/src/index.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '../worker/node_modules/playwright/index.mjs');
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: resolve('worker/src/index.js'),
  compatibilityDate: '2026-09-01', d1Databases: ['DB'], bindings: { ALLOWED_ORIGINS: 'http://localhost:8000' } }));
const db = await mf.getD1Database('DB');
for (const file of readdirSync('worker/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync('worker/migrations/' + file, 'utf8').replace(/^--.*$/gm, '').replace(/\n/g, ' '));
const apiUrl = String(await mf.ready).replace(/\/$/, '');
const server = createServer((req, res) => {
  const path = resolve('.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!path.startsWith(resolve('.') + '/')) { res.writeHead(403).end(); return; }
  readFile(path, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(path)] || 'text/plain');
    res.end(data);
  });
});
await new Promise(resolve => server.listen(8000, 'localhost', resolve));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome'), headless: true });
const errors = [];
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true, ...options });
  await ctx.route('**/js/config.js', route => route.fulfill({ contentType: 'text/javascript', body: `KQ.API_CONFIG={baseUrl:${JSON.stringify(apiUrl)},timeoutMs:600};` }));
  const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:8000'); return { ctx, page };
}
async function finish(page, quizId = 'erkennen', netMs = 1234) {
  // Seed a completed game; offline browser suite exercises all actual game mechanics.
  await page.evaluate(({ quizId, netMs }) => {
    KQ.onlineStorage.update(s => { s.recent = { quizId, netMs, totalMs: netMs, penaltyMs: 0, errors: 0,
      rounds: [{ id: 'ZH', errors: 0 }], date: new Date().toISOString(), saved: false, isBest: true }; });
  }, { quizId, netMs });
  await page.reload(); await page.goto('http://localhost:8000/#/ergebnis');
  await page.locator('#score-form').waitFor();
}
async function submit(page, name) {
  if (name !== undefined) await page.locator('#player-name').fill(name);
  await page.locator('#score-form button').click();
}
async function status(page, text) { await page.waitForFunction(text => document.querySelector('#result-sharing [role=status]')?.textContent.includes(text), text); }
async function ranking(page, id = 'erkennen', count = 1) {
  await page.goto('http://localhost:8000/#/rangliste');
  await page.locator('#refresh-scores').click();
  await page.waitForFunction(({ id, count }) => document.querySelectorAll('#ranking-' + id + ' tbody tr').length === count, { id, count });
}
const call = async (path, method, data) => {
  const res = await mf.dispatchFetch('http://localhost/api/v1/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  return res;
};
try {
  const { ctx: a, page: p } = await context();
  const { page: q } = await context({ timezoneId: 'America/New_York' });
  await finish(p); await submit(p, ' mia '); await status(p, 'In gemeinsamer Rangliste gespeichert');
  assert.equal(await p.evaluate(() => KQ.onlineStorage.load().nickname), 'MIA');
  await ranking(q); assert.equal(await q.locator('#ranking-erkennen tbody th').textContent(), 'MIA');
  assert.equal(await q.locator('.quiz-ranking').count(), 7);
  assert.equal(await q.evaluate(() => location.hash), '#/rangliste');
  // The date and time must use Switzerland, even for browsers in another timezone.
  await db.prepare("UPDATE scores SET achieved_at='2026-09-11T22:34:56.000Z' WHERE nickname='MIA'").run();
  await q.locator('#refresh-scores').click();
  await q.waitForFunction(() => document.querySelector('#ranking-erkennen tbody td:nth-child(5)')?.textContent === '12.09.2026');
  assert.equal(await q.locator('#ranking-erkennen tbody td:nth-child(6)').textContent(), '00:34');
  assert.equal(await q.locator('#ranking-finden').textContent(), 'Noch keine Einträge. Hier ist Platz für deine erste Zeit.');
  await ranking(p); assert.equal(await p.locator('tr.latest').count(), 1);
  await p.reload(); await p.locator('tr.latest').waitFor();
  await finish(q); await submit(q, 'MIA'); await status(q, 'Dieses Kürzel wird schon verwendet');
  assert.equal(await q.locator('#player-name').isEditable(), true);
  await q.evaluate(() => localStorage.clear()); await q.reload(); await finish(q); await submit(q, 'MIA'); await status(q, 'Dieses Kürzel wird schon verwendet');
  await finish(p, 'erkennen', 9999); await submit(p); await status(p, 'bisherige Bestzeit bleibt bestehen');
  assert.equal(await p.locator('#player-name').count(), 0);
  // Response lost after the server commits; reload must reuse exactly the same ID.
  await q.route('**/api/v1/players', async route => { await route.fetch(); await route.abort(); });
  await submit(q, 'RETRY'); await status(q, 'Ergebnis noch nicht übertragen.');
  const reservation = await q.evaluate(() => KQ.onlineStorage.load().reservation);
  await q.unroute('**/api/v1/players'); await q.reload();
  assert.equal(await q.locator('#player-name').inputValue(), 'RETRY');
  assert.deepEqual(await q.evaluate(() => KQ.onlineStorage.load().reservation), reservation);
  await submit(q); await status(q, 'In gemeinsamer Rangliste gespeichert');
  // A failed score survives navigation/reload and a nickname change.
  await finish(p, 'finden', 2222);
  await p.route('**/api/v1/scores', route => route.abort());
  await submit(p); await status(p, 'Ergebnis noch nicht übertragen.');
  await p.locator('#result-home').click();
  await p.goto('http://localhost:8000/#/rangliste');
  await p.locator('[data-retry]').waitFor();
  p.once('dialog', dialog => dialog.accept()); await p.locator('#change-nickname-ranking').click();
  await p.unroute('**/api/v1/scores'); await p.reload();
  assert.equal(await p.evaluate(() => KQ.onlineStorage.load().pending[0].nickname), 'MIA');
  await p.locator('[data-retry]').click(); await p.locator('#ranking-finden tbody tr').waitFor();
  assert.equal(await p.locator('#ranking-finden tbody th').textContent(), 'MIA');
  assert.equal(await p.evaluate(() => KQ.onlineStorage.load().pending.length), 0);
  // An unregistered result stays local when leaving, and old names remain suggestions only.
  await p.evaluate(() => localStorage.setItem('kantonquiz.v1', JSON.stringify({ lastName: 'LEGACY' })));
  await finish(p, 'blitz'); assert.equal(await p.locator('#player-name').inputValue(), 'LEGACY');
  await p.locator('#result-home').click();
  assert.equal(await p.evaluate(() => KQ.onlineStorage.load().nickname), null);
  assert.equal(await p.evaluate(() => KQ.onlineStorage.load().pending.length), 0);
  // Recover server-deleted reservation without reassigning old pending results.
  await finish(q, 'nachbarn');
  await db.prepare("DELETE FROM scores WHERE nickname='RETRY'").run();
  await db.prepare("DELETE FROM players WHERE nickname='RETRY'").run();
  await submit(q); await status(q, 'Kürzel nicht reserviert');
  assert.equal(await q.evaluate(() => KQ.onlineStorage.load().nickname), null);
  await q.goto('http://localhost:8000/#/rangliste');
  await q.getByRole('button', { name: 'Kürzel erneut reservieren und übertragen' }).click();
  await q.locator('tr.latest').waitFor();
  await finish(q, 'silhouette', 4321); await submit(q); await status(q, 'In gemeinsamer Rangliste gespeichert');
  await ranking(p, 'silhouette');
  assert.equal(await p.locator('#ranking-silhouette tbody th').textContent(), 'RETRY');
  for (const quiz of ['wappen-erkennen', 'wappen-blitz']) {
    await finish(q, quiz, 5432); await submit(q); await status(q, 'In gemeinsamer Rangliste gespeichert');
    await ranking(p, quiz);
    assert.equal(await p.locator('#ranking-' + quiz + ' tbody th').textContent(), 'RETRY');
  }
  // All rows render, even beyond ten; input is text and ranks are contiguous.
  for (let i = 0; i < 12; i++) {
    await call('players', 'POST', { nickname: 'MORE' + i, requestId: crypto.randomUUID() });
    await call('scores', 'PUT', { nickname: 'MORE' + i, quizId: 'blitz', netMs: 2000 + i, penaltyMs: 0, errors: 0 });
  }
  await ranking(q, 'blitz', 12);
  assert.deepEqual(await q.locator('#ranking-blitz tbody td:first-child').allTextContents(), Array.from({ length: 12 }, (_, i) => String(i + 1)));
  await q.screenshot({ path: '/tmp/kanton-quiz-online-ranking.png', fullPage: true });
  // Load errors never retain a seemingly fresh table, timeout is bounded.
  await q.route('**/api/v1/leaderboard?**', route => route.abort());
  await q.locator('#refresh-scores').click();
  await q.waitForFunction(() => document.getElementById('ranking').textContent.includes('Rangliste nicht geladen'));
  assert.equal(await q.locator('#ranking tbody').count(), 0);
  await q.unroute('**/api/v1/leaderboard?**');
  await q.route('**/api/v1/leaderboard?quizId=erkennen', async route => { await new Promise(r => setTimeout(r, 300)); await route.continue(); });
  await q.locator('#refresh-scores').click();
  await q.goto('http://localhost:8000/#/lernen');
  await q.waitForTimeout(350);
  assert.equal(await q.locator('#learn-view').isVisible(), true);
  assert.equal(await q.locator('#leaderboard-view').isVisible(), false);
  await q.goto('http://localhost:8000/#/rangliste/blitz');
  await q.waitForFunction(() => location.hash === '#/rangliste' && document.querySelectorAll('#ranking-blitz tbody tr').length === 12);
  assert.equal(await q.locator('#leaderboard-title').textContent(), 'Alle Ranglisten');
  // One failed quiz does not hide the other three rankings.
  await q.route('**/api/v1/leaderboard?quizId=finden', route => route.abort());
  await q.locator('#refresh-scores').click();
  await q.waitForFunction(() => document.getElementById('ranking-finden').textContent.includes('Rangliste nicht geladen') && document.querySelectorAll('#ranking-blitz tbody tr').length === 12);
  await q.unroute('**/api/v1/leaderboard?quizId=finden');
  // Slow reservation: duplicate submit disabled, navigation stays immediate.
  const { page: slow } = await context(); await finish(slow);
  await slow.route('**/api/v1/players', async route => { await new Promise(r => setTimeout(r, 1000)); await route.abort(); });
  await submit(slow, 'SLOW'); assert.equal(await slow.locator('#score-form button').isDisabled(), true);
  await status(slow, 'Zeitüberschreitung');
  // Navigation while a write is slow must not wait for the ten-second production timeout.
  await finish(q, 'blitz', 3456);
  await q.route('**/api/v1/scores', async route => { await new Promise(r => setTimeout(r, 1000)); await route.abort(); });
  await q.locator('#result-home').click();
  await q.locator('#home-view').waitFor();
  assert.equal(await q.evaluate(() => KQ.onlineStorage.load().pending[0].nickname), 'RETRY');
  await q.waitForTimeout(700);
  await q.unroute('**/api/v1/scores');
  // HTTP errors cannot become a successful save either.
  await q.route('**/api/v1/scores', route => route.fulfill({ status: 503, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': 'http://localhost:8000' }, body: JSON.stringify({ error: { code: 'TEMPORARY', message: 'Server nicht verfügbar.' } }) }));
  await q.goto('http://localhost:8000/#/rangliste/blitz');
  await q.locator('[data-retry]').click();
  await q.waitForFunction(() => document.querySelector('.pending-entry [role=status]')?.textContent.includes('Server nicht verfügbar'));
  assert.equal(await q.evaluate(() => KQ.onlineStorage.load().pending.length), 1);
  await q.unroute('**/api/v1/scores');
  await q.locator('[data-retry]').click();
  await q.waitForFunction(() => KQ.onlineStorage.load().pending.length === 0);
  // Missing configuration leaves the game playable and explains unavailable sharing.
  const { ctx: unconfigured, page: u } = await context();
  await unconfigured.route('**/js/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "KQ.API_CONFIG={baseUrl:'',timeoutMs:600};" }));
  await u.reload();
  await u.waitForFunction(() => document.getElementById('best-blitz').textContent.includes('noch nicht konfiguriert'));
  await u.goto('http://localhost:8000/#/quiz/erkennen');
  assert.equal(await u.locator('#game-view').isVisible(), true);
  // Corrupt/blocked storage does not stop a quiz or a reservation in session memory.
  const { ctx: blocked, page: b } = await context();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await b.reload(); await b.goto('http://localhost:8000/#/quiz/blitz');
  assert.equal(await b.locator('#game-view').isVisible(), true);
  await b.evaluate(() => { KQ.onlineStorage.confirm('SESSION'); });
  await b.goto('http://localhost:8000/#/rangliste');
  assert.equal(await b.locator('#storage-note').isVisible(), true);
  assert.equal(await b.evaluate(() => KQ.onlineStorage.load().nickname), 'SESSION');
  await a.close(); assert.deepEqual(errors, []);
  console.log('✓ Online: zwei Browser, Reservierung/Retry/Reload, alle Einträge, Bestzeit, Netzwerkfehler, Kürzelwechsel, fehlende Reservierung, alte/blockierte Daten, Routenwechsel und Timeout.');
} finally { await browser.close(); await mf.dispose(); await new Promise(resolve => server.close(resolve)); }

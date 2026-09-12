import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { penalties } from '../src/index.js';
let mf, db;
const origin = 'https://jbandi.github.io';
const request = async (path, method = 'GET', data, headers = {}) => {
  const response = await mf.dispatchFetch('http://localhost/api/v1/' + path, { method,
    headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
};
const reserve = (nickname, requestId = crypto.randomUUID()) => request('players', 'POST', { nickname, requestId });
const score = (nickname, netMs = 1000, quizId = 'erkennen', extra = {}) => request('scores', 'PUT', { nickname, netMs, quizId, penaltyMs: 0, errors: 0, ...extra });
before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: new URL('../src/index.js', import.meta.url).pathname,
    compatibilityDate: '2026-09-01', d1Databases: ['DB'], bindings: { ALLOWED_ORIGINS: origin + ',http://localhost:8000' } }));
  db = await mf.getD1Database('DB');
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    // Seed the old schema to prove that upgrading preserves existing scores.
    if (file === '0002_silhouette_quiz.sql') {
      await db.exec("INSERT INTO players VALUES ('OLD','old-reservation','2026-01-01'); INSERT INTO scores VALUES ('OLD','blitz',1000,0,1000,0,'2026-01-01');");
    }
    await db.exec(readFileSync(new URL(file, dir), 'utf8').replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
  assert.equal((await db.prepare("SELECT total_ms FROM scores WHERE nickname='OLD'").first()).total_ms, 1000);
  assert.equal((await db.prepare("SELECT achieved_at FROM scores WHERE nickname='OLD'").first()).achieved_at, '2026-01-01');
  await db.exec("DELETE FROM scores WHERE nickname='OLD'; DELETE FROM players WHERE nickname='OLD';");
});
after(async () => { await mf?.dispose(); });
test('penalties are identical to frontend configuration', () => {
  const context = {}; context.window = context; vm.createContext(context);
  vm.runInContext(readFileSync(new URL('../../js/data.js', import.meta.url), 'utf8'), context);
  assert.deepEqual(Object.fromEntries(Object.entries(context.window.KQ.CONFIG).map(([id, c]) => [id, c.penalty])), penalties);
});
test('atomic reservation, normalization, response loss retry and request ID uniqueness', async () => {
  const id = crypto.randomUUID();
  assert.equal((await reserve(' mia ', id)).status, 201);
  assert.equal((await reserve('MIA', id)).status, 200);
  assert.equal((await reserve('MIA')).status, 409);
  assert.equal((await reserve('ELSE', id)).status, 409);
  const race = await Promise.all([reserve('RACE'), reserve('RACE')]);
  assert.deepEqual(race.map(r => r.status).sort(), [201, 409]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM players WHERE nickname=?').bind('RACE').first()).n, 1);
});
test('strict atomic best score, duplicates, concurrent writes and separate modes', async () => {
  await reserve('BEST');
  const initial = await score('BEST', 2000);
  assert.equal(initial.body.improved, true);
  for (const time of [2000, 3000, 2000]) {
    const response = await score('BEST', time);
    assert.equal(response.body.improved, false);
    assert.deepEqual(response.body.best, initial.body.best);
  }
  await Promise.all([score('BEST', 500), score('BEST', 1500), score('BEST', 700)]);
  assert.equal((await score('BEST', 500)).body.best.netMs, 500);
  for (const id of Object.keys(penalties)) assert.equal((await score('BEST', 500, id)).status, 200);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE nickname=?').bind('BEST').first()).n, Object.keys(penalties).length);
  const computed = await score('BEST', 300, 'blitz', { totalMs: 1, achievedAt: 'fake', rank: 1 });
  assert.equal(computed.body.best.totalMs, 300);
  assert.notEqual(computed.body.best.achievedAt, 'fake');
});
test('all entries, millisecond sorting and deterministic tie break', async () => {
  for (let i = 0; i < 15; i++) { await reserve('LIST' + i); await score('LIST' + i, 1000 + i, 'finden'); }
  await db.prepare("UPDATE scores SET net_ms=1000,total_ms=1000,achieved_at='2026-01-01T00:00:00.000Z' WHERE nickname IN ('LIST0','LIST1')").run();
  const response = await request('leaderboard?quizId=finden');
  assert.equal(response.body.entries.length, 16);
  assert.deepEqual(response.body.entries.slice(1, 3).map(e => e.nickname), ['LIST0', 'LIST1']);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('invalid input, bounds, CORS and unsupported requests', async () => {
  for (const nickname of ['', 'A', 'M A', '<script>', 'ABCDEFGHIJKLM', 'ßß', 123]) assert.equal((await reserve(nickname)).status, 400);
  for (const extra of [{ netMs: 0 }, { netMs: 86400001 }, { netMs: 1.5 }, { netMs: null }, { errors: 10001 }, { errors: -1 }, { errors: 1, penaltyMs: 0 }, { quizId: 'toString' }])
    assert.equal((await score('BEST', 1000, 'erkennen', extra)).status, 400);
  assert.equal((await score('MISSING')).body.error.code, 'NICKNAME_NOT_FOUND');
  assert.equal((await request('leaderboard?quizId=unknown')).status, 400);
  assert.equal((await request('scores', 'DELETE')).status, 405);
  for (const Origin of ['null', 'https://evil.example']) assert.equal((await request('scores', 'OPTIONS', null, { Origin })).status, 403);
  const preflight = await request('scores', 'OPTIONS');
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await request('players', 'POST', { nickname: 'LONG', requestId: 'x'.repeat(5000) })).status, 413);
  assert.equal((await request('players', 'POST', {}, { 'Content-Type': 'text/plain' })).status, 415);
  const malformed = await mf.dispatchFetch('http://localhost/api/v1/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(malformed.status, 400);
});

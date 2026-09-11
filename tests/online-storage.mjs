import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let stored = {}; let blocked = false;
function boot() {
  const c = { crypto, localStorage: {
    getItem(key) { if (blocked) throw Error('blocked'); return stored[key] || null; },
    setItem(key, value) { if (blocked) throw Error('blocked'); stored[key] = value; }
  } }; c.window = c; vm.createContext(c);
  for (const file of ['data', 'storage']) vm.runInContext(readFileSync(new URL('../js/' + file + '.js', import.meta.url), 'utf8'), c);
  return c.KQ;
}
for (const raw of ['{bad', 'null', '[]', '{"pending":[null,{}],"nickname":{},"recent":{},"personal":null}']) {
  stored = { 'kantonquiz.online.v1': raw };
  assert.equal(boot().onlineStorage.load().pending.length, 0);
}
stored = { 'kantonquiz.v1': JSON.stringify({ lastName: 'MIA' }) };
let KQ = boot(); assert.equal(KQ.onlineStorage.load().nickname, null);
assert.equal(KQ.normalizeNickname(' mia '), 'MIA');
for (const value of ['M A', 'A', '<MIA>', 'ABCDEFGHIJKLM', 'ßß']) assert.equal(KQ.validNickname(value), false);
const attempt = KQ.onlineStorage.reservation('MIA');
KQ = boot(); assert.equal(KQ.onlineStorage.reservation('MIA').requestId, attempt.requestId);
assert.notEqual(KQ.onlineStorage.reservation('NEW').requestId, attempt.requestId);
KQ.onlineStorage.confirm('MIA'); KQ = boot(); assert.equal(KQ.onlineStorage.load().nickname, 'MIA');
const score = { quizId: 'blitz', netMs: 1000, totalMs: 1000, penaltyMs: 0, errors: 0 };
const entry = KQ.onlineStorage.enqueue(score, 'MIA');
KQ.onlineStorage.enqueue({ ...score, netMs: 2000, totalMs: 2000 }, 'MIA');
assert.equal(KQ.onlineStorage.load().pending[0].id, entry.id);
KQ.onlineStorage.forget(); KQ.onlineStorage.confirm('NEW'); KQ = boot();
assert.equal(KQ.onlineStorage.load().pending[0].nickname, 'MIA');
KQ.onlineStorage.enqueue({ ...score, netMs: 500, totalMs: 500 }, 'MIA');
KQ.onlineStorage.remove(entry.id); assert.equal(KQ.onlineStorage.load().pending.length, 1, 'An older in-flight success must not discard a better pending score');
blocked = true; KQ = boot(); KQ.onlineStorage.confirm('SESSION');
assert.equal(KQ.onlineStorage.available, false); assert.equal(KQ.onlineStorage.load().nickname, 'SESSION');
console.log('✓ Online-Speicher: beschädigte/blockierte Daten, Normalisierung, Reload, Reservierung und stabile Warteschlange.');

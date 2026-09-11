import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
let now = 0;
let stored = null;
let blocked = false;
const context = { console, performance: { now: () => now }, setInterval: () => 1, clearInterval: () => {}, localStorage: {
  getItem() { if (blocked) throw Error('blocked'); return stored; },
  setItem(key, value) { if (blocked) throw Error('blocked'); stored = value; }
}};
context.window = context;
vm.createContext(context);
for (const file of ['data', 'storage', 'timer', 'quiz-erkennen', 'quiz-nachbarn']) vm.runInContext(readFileSync(new URL('../js/' + file + '.js', import.meta.url), 'utf8'), context);
const KQ = context.KQ;
for (let run = 0; run < 200; run++) for (const target of KQ.KANTONE) {
  for (let block = 0; block < 3; block++) {
    const options = KQ.recognitionOptions(target, block);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(target.id));
    const adjacent = options.filter(id => target.nachbarn.includes(id));
    assert.ok(adjacent.length >= 1 && adjacent.length <= 2);
  }
  const options = KQ.neighbourOptions(target);
  assert.equal(new Set(options).size, 4);
  assert.ok(!options.includes(target.id));
  const correct = options.filter(id => target.nachbarn.includes(id));
  assert.ok(correct.length >= 1 && correct.length <= 3);
}
const timer = new KQ.Timer(() => {});
timer.resume(); now = 1234; timer.addPenalty(10000);
assert.equal(timer.read().totalMs, 11234);
timer.pause(); now = 9000; assert.equal(timer.read().netMs, 1234);
timer.resume(); now = 10000; assert.equal(timer.stop().totalMs, 12234);
now = 20000; assert.equal(timer.read().netMs, 2234);
const storage = KQ.storage;
for (const raw of [null, '{broken', 'null', '[]', '{"scores":{"blitz":[null,{}, {"name":"<script>"}]}}']) {
  stored = raw;
  assert.equal(storage.load().scores.blitz.length, 0);
}
for (let i = 20; i > 0; i--) storage.addScore('blitz', { name: 'Mia', totalMs: i * 1000, netMs: i * 1000, penaltyMs: 0, errors: 0, date: '2026-09-11T08:12:00.000Z' });
assert.equal(storage.load().scores.blitz.length, 10);
assert.equal(storage.getBest('blitz').totalMs, 1000);
assert.equal(storage.load().scores.blitz[9].totalMs, 10000);
assert.equal(storage.load().lastName, 'Mia');
storage.clear('erkennen'); assert.equal(storage.load().scores.blitz.length, 10);
storage.clear('blitz'); assert.equal(storage.getBest('blitz'), null);
blocked = true;
storage.addScore('finden', { name: 'Offline', totalMs: 11000, netMs: 1000, penaltyMs: 10000, errors: 1, date: '2026-09-11T08:12:00.000Z' });
assert.equal(storage.getBest('finden').name, 'Offline');
assert.equal(storage.available, false);
console.log('✓ Zufallsauswahl (20 800 Fragen), Zeitstempel/Pause/Malus, defekte Daten, Top 10 und Sitzungsspeicher geprüft.');

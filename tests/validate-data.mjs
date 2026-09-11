import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const context = { window: {} };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(path.join(root, 'js/data.js'), 'utf8'), context);
  const data = context.KQ.KANTONE;
  assert.equal(data.length, 26, 'Es müssen genau 26 Kantone vorhanden sein.');
  const ids = new Set(data.map(k => k.id));
  assert.equal(ids.size, 26, 'Kantonskürzel müssen eindeutig sein.');
  for (const k of data) {
    assert.match(k.id, /^[A-Z]{2}$/, 'Ungültiges Kürzel: ' + k.id);
    for (const key of ['name', 'hauptort']) assert.ok(typeof k[key] === 'string' && k[key].trim(), k.id + ': ' + key + ' fehlt.');
    assert.ok(Array.isArray(k.nachbarn) && k.nachbarn.length, k.id + ': Nachbarn fehlen.');
    assert.equal(new Set(k.nachbarn).size, k.nachbarn.length, k.id + ': Doppelte Nachbarn.');
    for (const id of k.nachbarn) {
      assert.notEqual(k.id, id, k.id + ': Selbstbezug.');
      assert.ok(ids.has(id), k.id + ': Unbekannter Nachbar ' + id);
      assert.ok(data.find(n => n.id === id).nachbarn.includes(k.id), k.id + '–' + id + ': Nachbarschaft nicht symmetrisch.');
    }
    assert.ok(existsSync(path.join(root, 'assets/wappen', k.id + '.svg')), 'Wappen fehlt: ' + k.id);
    assert.match(readFileSync(path.join(root, 'assets/wappen', k.id + '.svg'), 'utf8'), /<svg\b/, 'Ungültiges SVG: ' + k.id);
  }
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const map = html.match(/<svg\b[^>]*id="swiss-map"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(map, 'Inline-Karte fehlt.');
  const elements = [...html.matchAll(/<[^>]+\bid="k-([^"]+)"[^>]*>/g)];
  assert.equal(elements.length, 26, 'Es müssen genau 26 Kantonsflächen existieren.');
  for (const id of ids) assert.equal(elements.filter(m => m[1] === id).length, 1, 'Kartenfläche fehlt oder doppelt: ' + id);
  for (const [tag, id] of elements) {
    assert.ok(ids.has(id), 'Unbekannte Kartenfläche: ' + id);
    assert.match(tag, /class="[^"]*\bkanton\b/, id + ': Klasse kanton fehlt.');
  }
  assert.doesNotMatch(map, /<(?:[\w-]+:)?(?:title|text)\b/i, 'Die Karte darf keine title- oder text-Elemente enthalten.');
  console.log('✓ 26 Kantone, symmetrische Nachbarn, 26 Kartenflächen und 26 SVG-Wappen validiert.');
} catch (error) {
  console.error('Datenvalidierung fehlgeschlagen: ' + error.message);
  process.exitCode = 1;
}

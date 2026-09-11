// Read-only deployment smoke check, safe against the production database.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = { window: { KQ: {} } }; vm.createContext(context);
vm.runInContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), context);
const base = context.window.KQ.API_CONFIG.baseUrl;
for (const quizId of ['erkennen', 'finden', 'nachbarn', 'blitz']) {
  const response = await fetch(base + '/api/v1/leaderboard?quizId=' + quizId, { headers: { Origin: 'https://jbandi.github.io' }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://jbandi.github.io');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json(); assert.equal(data.quizId, quizId); assert.ok(Array.isArray(data.entries));
}
console.log('✓ Live-API: vier Ranglisten, Produktions-CORS und no-store.');

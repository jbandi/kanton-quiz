export const penalties = { erkennen: 10000, finden: 10000, nachbarn: 5000, blitz: 5000, silhouette: 10000 };
const columns = `nickname, quiz_id AS quizId, net_ms AS netMs, penalty_ms AS penaltyMs,
  total_ms AS totalMs, errors, achieved_at AS achievedAt`;
const nickname = value => typeof value === 'string' ? value.trim().replace(/[a-z]/g, c => c.toUpperCase()) : '';
const validNickname = value => /^[A-Z0-9_-]{2,12}$/.test(value);
const validQuiz = value => typeof value === 'string' && Object.hasOwn(penalties, value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
function failure(status, code, message) { throw Object.assign(new Error(message), { status, code }); }
async function body(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    failure(415, 'CONTENT_TYPE', 'JSON erforderlich.');
  const reader = request.body?.getReader();
  if (!reader) failure(400, 'INVALID_JSON', 'JSON erforderlich.');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); failure(413, 'BODY_TOO_LARGE', 'Anfrage zu gross.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
    return data;
  } catch { failure(400, 'INVALID_JSON', 'Ungültiges JSON.'); }
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    try {
      if (origin && !allowed.includes(origin)) failure(403, 'ORIGIN_NOT_ALLOWED', 'Dieser Ursprung ist nicht freigegeben.');
      if (origin) headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      const path = new URL(request.url).pathname;
      if (!['/api/v1/players', '/api/v1/scores', '/api/v1/leaderboard'].includes(path))
        failure(404, 'NOT_FOUND', 'Unbekannter API-Pfad.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (path === '/api/v1/players' && request.method === 'POST') {
        const data = await body(request); const name = nickname(data.nickname);
        if (!validNickname(name) || typeof data.requestId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId))
          failure(400, 'INVALID_PLAYER', 'Kürzel: 2–12 Zeichen (A–Z, 0–9, _ oder -); gültige Request-ID erforderlich.');
        const requestId = data.requestId.toLowerCase();
        const [insert, found] = await env.DB.batch([
          env.DB.prepare('INSERT INTO players (nickname, reservation_request_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING')
            .bind(name, requestId, new Date().toISOString()),
          env.DB.prepare('SELECT reservation_request_id FROM players WHERE nickname = ?').bind(name)
        ]);
        if (found.results[0]?.reservation_request_id !== requestId)
          failure(409, 'NICKNAME_CONFLICT', 'Dieses Kürzel wird schon verwendet. Bitte wähle ein anderes.');
        return json({ nickname: name }, insert.meta.changes ? 201 : 200);
      }
      if (path === '/api/v1/scores' && request.method === 'PUT') {
        const data = await body(request); const name = nickname(data.nickname);
        const { quizId, netMs, penaltyMs, errors } = data;
        if (!validNickname(name) || !validQuiz(quizId) || ![netMs, penaltyMs, errors].every(integer) ||
            netMs < 1 || netMs > 86400000 || errors > 10000 || penaltyMs !== errors * penalties[quizId])
          failure(400, 'INVALID_SCORE', 'Ungültige Zeit, Fehleranzahl oder Strafzeit.');
        // The conditional insert and SELECT share a D1 transaction. No check-then-write race.
        const [update, best] = await env.DB.batch([
          env.DB.prepare(`INSERT INTO scores (nickname, quiz_id, net_ms, penalty_ms, total_ms, errors, achieved_at)
            SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM players WHERE nickname = ?)
            ON CONFLICT(nickname, quiz_id) DO UPDATE SET net_ms=excluded.net_ms, penalty_ms=excluded.penalty_ms,
              total_ms=excluded.total_ms, errors=excluded.errors, achieved_at=excluded.achieved_at
            WHERE excluded.total_ms < scores.total_ms`)
            .bind(name, quizId, netMs, penaltyMs, netMs + penaltyMs, errors, new Date().toISOString(), name),
          env.DB.prepare(`SELECT ${columns} FROM scores WHERE nickname = ? AND quiz_id = ?`).bind(name, quizId)
        ]);
        if (!best.results.length) failure(404, 'NICKNAME_NOT_FOUND', 'Kürzel nicht reserviert. Bitte erneut reservieren.');
        return json({ improved: update.meta.changes > 0, best: best.results[0] });
      }
      if (path === '/api/v1/leaderboard' && request.method === 'GET') {
        const quizId = new URL(request.url).searchParams.get('quizId');
        if (!validQuiz(quizId)) failure(400, 'INVALID_QUIZ', 'Unbekanntes Quiz.');
        const rows = await env.DB.prepare(`SELECT ${columns} FROM scores WHERE quiz_id = ? ORDER BY total_ms, achieved_at, nickname`).bind(quizId).all();
        return json({ quizId, entries: rows.results });
      }
      failure(405, 'METHOD_NOT_ALLOWED', 'Methode nicht erlaubt.');
    } catch (error) {
      return json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'Speichern oder Laden momentan nicht möglich.' } }, error.status || 500);
    }
  }
};

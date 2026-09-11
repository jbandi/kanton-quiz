CREATE TABLE players (
  nickname TEXT PRIMARY KEY,
  reservation_request_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE scores (
  nickname TEXT NOT NULL REFERENCES players(nickname),
  quiz_id TEXT NOT NULL CHECK (quiz_id IN ('erkennen','finden','nachbarn','blitz')),
  net_ms INTEGER NOT NULL CHECK (net_ms BETWEEN 1 AND 86400000),
  penalty_ms INTEGER NOT NULL CHECK (penalty_ms >= 0),
  total_ms INTEGER NOT NULL CHECK (total_ms = net_ms + penalty_ms),
  errors INTEGER NOT NULL CHECK (errors BETWEEN 0 AND 10000),
  achieved_at TEXT NOT NULL,
  PRIMARY KEY (nickname, quiz_id)
);
CREATE INDEX scores_leaderboard ON scores(quiz_id, total_ms, achieved_at, nickname);

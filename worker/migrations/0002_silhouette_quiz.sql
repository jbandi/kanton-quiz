-- Rebuild to extend the quiz CHECK constraint while preserving every best score.
CREATE TABLE scores_next (
  nickname TEXT NOT NULL REFERENCES players(nickname),
  quiz_id TEXT NOT NULL CHECK (quiz_id IN ('erkennen','finden','nachbarn','blitz','silhouette')),
  net_ms INTEGER NOT NULL CHECK (net_ms BETWEEN 1 AND 86400000),
  penalty_ms INTEGER NOT NULL CHECK (penalty_ms >= 0),
  total_ms INTEGER NOT NULL CHECK (total_ms = net_ms + penalty_ms),
  errors INTEGER NOT NULL CHECK (errors BETWEEN 0 AND 10000),
  achieved_at TEXT NOT NULL,
  PRIMARY KEY (nickname, quiz_id)
);
INSERT INTO scores_next SELECT * FROM scores;
DROP TABLE scores;
ALTER TABLE scores_next RENAME TO scores;
CREATE INDEX scores_leaderboard ON scores(quiz_id, total_ms, achieved_at, nickname);

-- Vytvoření tabulky pro žebříček
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(20) NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pro rychlejší řazení
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC, wave DESC);

-- Index pro časové řazení
CREATE INDEX IF NOT EXISTS idx_leaderboard_created ON leaderboard(created_at DESC);

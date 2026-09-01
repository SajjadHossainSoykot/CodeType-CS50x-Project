-- CodeType database schema

CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snippet_id TEXT NOT NULL,
    language TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    wpm REAL NOT NULL,
    accuracy REAL NOT NULL,
    errors INTEGER NOT NULL,
    duration_seconds REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

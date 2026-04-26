PRAGMA foreign_keys = ON;

CREATE TABLE stages (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topics (
    id                    TEXT PRIMARY KEY,
    stage_id              TEXT NOT NULL,
    name                  TEXT NOT NULL,
    sort_order            INTEGER NOT NULL,
    difficulty            INTEGER DEFAULT 2,
    study_time_minutes    INTEGER DEFAULT 30,
    why                   TEXT,
    real_world_connection TEXT,
    is_deleted            INTEGER DEFAULT 0,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);

CREATE TABLE key_points (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id   TEXT NOT NULL,
    content    TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE prerequisites (
    topic_id        TEXT NOT NULL,
    prerequisite_id TEXT NOT NULL,
    PRIMARY KEY (topic_id, prerequisite_id),
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (prerequisite_id) REFERENCES topics(id)
);

CREATE TABLE questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id        TEXT NOT NULL,
    question_type   TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    options         TEXT,
    correct_answer  TEXT NOT NULL,
    explanation     TEXT,
    is_deleted      INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE exam_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_type        TEXT NOT NULL,
    scope            TEXT,
    total_questions  INTEGER NOT NULL,
    correct_count    INTEGER DEFAULT 0,
    score            REAL DEFAULT 0,
    started_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at      DATETIME
);

CREATE TABLE exam_answers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id         INTEGER NOT NULL,
    question_id     INTEGER NOT NULL,
    user_answer     TEXT,
    is_correct      INTEGER,
    FOREIGN KEY (exam_id) REFERENCES exam_records(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE topic_progress (
    topic_id    TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed')),
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

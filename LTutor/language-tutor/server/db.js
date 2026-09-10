// db.js — single SQLite connection + schema creation + seed data.
// better-sqlite3 is synchronous, which keeps this small backend simple to reason about.

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'tutor.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Learner',
  target_language TEXT NOT NULL DEFAULT 'italian',
  cefr_level TEXT NOT NULL DEFAULT 'A2',
  explanation_language TEXT NOT NULL DEFAULT 'English',
  learning_goal TEXT DEFAULT 'Reach B1/B2',
  daily_goal_minutes INTEGER NOT NULL DEFAULT 45,
  theme TEXT NOT NULL DEFAULT 'dark',
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);

CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY,        -- e.g. 'it', 'rw', 'en', 'fr', 'es'
  name TEXT NOT NULL,
  voice_lang_tag TEXT NOT NULL, -- BCP-47 tag for speechSynthesis/recognition, e.g. 'it-IT'
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  part_of_speech TEXT,
  gender TEXT,                  -- 'masculine' | 'feminine' | 'neuter' | NULL
  example_sentence TEXT,
  pronunciation TEXT,
  difficulty TEXT DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  status TEXT NOT NULL DEFAULT 'learning', -- 'learning' | 'known' | 'difficult'
  date_learned TEXT NOT NULL DEFAULT (datetime('now')),
  srs_ease REAL NOT NULL DEFAULT 2.5,     -- spaced-repetition ease factor
  srs_interval_days REAL NOT NULL DEFAULT 1,
  srs_due_date TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS grammar_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  cefr_level TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  category TEXT NOT NULL,        -- short tag, e.g. "preposition: a vs in"
  description TEXT NOT NULL,
  example_wrong TEXT,
  example_correct TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'needs_practice', -- 'needs_practice' | 'improving' | 'resolved'
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  mode TEXT NOT NULL DEFAULT 'free', -- 'free' | 'teacher' | 'roleplay' | 'pronunciation' | 'listening'
  topic TEXT,
  scenario TEXT,                     -- roleplay scenario key, if mode = roleplay
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,          -- 'user' | 'assistant'
  content TEXT NOT NULL,
  correction TEXT,             -- JSON blob: {what_you_said, whats_wrong, corrected, why, example}
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  type TEXT NOT NULL, -- 'multiple_choice' | 'fill_blank' | 'translation' | 'ordering' | 'correct_sentence' | 'listening' | 'writing'
  cefr_level TEXT NOT NULL,
  prompt TEXT NOT NULL,
  data TEXT NOT NULL,      -- JSON: options/answer/etc, shape depends on type
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercise_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  correct INTEGER NOT NULL,
  answer_given TEXT,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL REFERENCES languages(code),
  date TEXT NOT NULL DEFAULT (date('now')),
  vocabulary_pct REAL DEFAULT 0,
  grammar_pct REAL DEFAULT 0,
  conversation_pct REAL DEFAULT 0,
  listening_pct REAL DEFAULT 0,
  minutes_studied INTEGER DEFAULT 0,
  UNIQUE(language_code, date)
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE DEFAULT (date('now')),
  plan_json TEXT NOT NULL,      -- JSON array of {label, minutes, done}
  focus_json TEXT                -- JSON array of focus topics for the day
);
`);

// Seed languages once.
const seedLanguages = db.prepare(
  `INSERT OR IGNORE INTO languages (code, name, voice_lang_tag) VALUES (?, ?, ?)`
);
const languageSeed = [
  ['it', 'Italian', 'it-IT'],
  ['rw', 'Kinyarwanda', 'rw-RW'],
  ['en', 'English', 'en-US'],
  ['fr', 'French', 'fr-FR'],
  ['es', 'Spanish', 'es-ES'],
];
const insertLanguages = db.transaction((rows) => {
  for (const row of rows) seedLanguages.run(...row);
});
insertLanguages(languageSeed);

// Seed default profile (row id=1) once, using the example from the spec.
db.prepare(
  `INSERT OR IGNORE INTO profile (id, name, target_language, cefr_level, explanation_language, learning_goal, daily_goal_minutes)
   VALUES (1, 'Eric', 'it', 'A2', 'English', 'Reach B1/B2', 45)`
).run();

// Seed a small starter grammar tree for Italian so the Grammar page isn't empty on first run.
const grammarSeedCount = db.prepare(`SELECT COUNT(*) AS n FROM grammar_topics WHERE language_code = 'it'`).get().n;
if (grammarSeedCount === 0) {
  const insertTopic = db.prepare(
    `INSERT INTO grammar_topics (language_code, cefr_level, title, summary, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  const topics = [
    ['it', 'A1', 'Articles', 'Definite and indefinite articles: il, lo, la, i, gli, le, un, uno, una.', 1],
    ['it', 'A1', 'Gender', 'Nouns are masculine or feminine; adjectives agree in gender and number.', 2],
    ['it', 'A1', 'Present tense', 'Regular -are/-ere/-ire verbs and the most common irregulars (essere, avere, andare, fare).', 3],
    ['it', 'A1', 'Basic prepositions', 'a, in, di, da, su, con, per and their simple contractions with articles.', 4],
    ['it', 'A1', 'Basic sentence structure', 'Subject-verb-object order, questions, and negation with "non".', 5],
    ['it', 'A2', 'Passato prossimo', 'Compound past tense with avere/essere + past participle, and auxiliary selection.', 6],
    ['it', 'A2', 'Imperfetto', 'The imperfect tense for habitual or ongoing past actions and descriptions.', 7],
    ['it', 'A2', 'Direct objects', 'Direct object pronouns (mi, ti, lo, la, ci, vi, li, le) and their placement.', 8],
    ['it', 'A2', 'Indirect objects', 'Indirect object pronouns (mi, ti, gli, le, ci, vi, gli/loro).', 9],
    ['it', 'A2', 'Common prepositions', 'More prepositional usage, including articulated prepositions in context.', 10],
    ['it', 'B1', 'Conditional', 'The conditional mood for polite requests, hypotheses, and advice.', 11],
    ['it', 'B1', 'Subjunctive introduction', 'When and why Italian uses the subjunctive (congiuntivo) after certain verbs and conjunctions.', 12],
    ['it', 'B1', 'Relative clauses', 'Using che, cui, and il quale to combine sentences.', 13],
    ['it', 'B1', 'Complex sentence structures', 'Linking clauses with subordinating conjunctions and varied word order.', 14],
  ];
  const insertMany = db.transaction((rows) => { for (const r of rows) insertTopic.run(...r); });
  insertMany(topics);
}

export default db;

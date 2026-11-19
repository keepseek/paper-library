import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'blog.db'))

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  year INTEGER,
  venue TEXT,
  arxiv_id TEXT,
  doi TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  one_liner TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  input TEXT NOT NULL DEFAULT '',
  output TEXT NOT NULL DEFAULT '',
  main_results TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'lab',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_tags (
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (paper_id, tag_id)
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  email TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  used_by INTEGER REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
  title, authors, one_liner, problem, input, output, main_results, method, notes, tags_text,
  tokenize = 'trigram'
);
`)

// ---------- helpers ----------

export function tagsOf(paperId) {
  return db
    .prepare('SELECT t.name FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id WHERE pt.paper_id = ? ORDER BY t.name')
    .all(paperId)
    .map((r) => r.name)
}

export function getPaperFull(id) {
  const p = db.prepare('SELECT * FROM papers WHERE id = ?').get(id)
  if (!p) return null
  p.tags = tagsOf(id)
  p.owner = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(p.owner_id)
  return p
}

export function syncFts(p) {
  db.prepare('DELETE FROM papers_fts WHERE rowid = ?').run(p.id)
  db.prepare(
    `INSERT INTO papers_fts (rowid, title, authors, one_liner, problem, input, output, main_results, method, notes, tags_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(p.id, p.title, p.authors, p.one_liner, p.problem, p.input, p.output, p.main_results, p.method, p.notes, (p.tags || []).join(' '))
}

export function setPaperTags(paperId, tagNames) {
  db.prepare('DELETE FROM paper_tags WHERE paper_id = ?').run(paperId)
  const ins = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)')
  const link = db.prepare('INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)')
  for (const name of tagNames) {
    const n = String(name).trim()
    if (!n) continue
    ins.run(n)
    const t = db.prepare('SELECT id FROM tags WHERE name = ?').get(n)
    link.run(paperId, t.id)
  }
}

/** 可见性过滤：owner 看全部；member 看 lab/public + 自己的 private；游客只看 public */
export function visibilityClause(user) {
  if (!user) return { sql: "p.visibility = 'public'", params: [] }
  if (user.role === 'owner') return { sql: '1=1', params: [] }
  return { sql: "(p.visibility IN ('lab','public') OR p.owner_id = ?)", params: [user.id] }
}

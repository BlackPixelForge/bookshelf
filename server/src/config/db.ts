import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/bookshelf.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      open_library_key TEXT,
      title TEXT NOT NULL,
      authors TEXT,
      publication_year INTEGER,
      isbn_13 TEXT,
      genres TEXT,
      cover_url TEXT,
      status TEXT DEFAULT 'unread',
      rating INTEGER,
      notes TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS book_tags (
      book_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (book_id, tag_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_books_status ON books(user_id, status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)');

  // Save initial database
  saveDatabase();

  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Helper functions for query execution
export function runQuery(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const database = getDatabase();
  database.run(sql, params);
  const changesResult = database.exec('SELECT changes() as changes, last_insert_rowid() as lastId');
  const changes = changesResult[0]?.values[0][0] as number || 0;
  const lastInsertRowid = changesResult[0]?.values[0][1] as number || 0;
  saveDatabase();
  return { changes, lastInsertRowid };
}

export function getOne<T>(sql: string, params: any[] = []): T | undefined {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();

    const row: any = {};
    columns.forEach((col: string, i: number) => {
      row[col] = values[i];
    });
    return row as T;
  }

  stmt.free();
  return undefined;
}

export function getAll<T>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const values = stmt.get();
    const row: any = {};
    columns.forEach((col: string, i: number) => {
      row[col] = values[i];
    });
    results.push(row as T);
  }

  stmt.free();
  return results;
}

export default { initDatabase, getDatabase, saveDatabase, runQuery, getOne, getAll };

import { neon } from '@neondatabase/serverless';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
}

// Create database connection
export const sql = neon(DATABASE_URL);

// Initialize database schema
export async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create books table
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        open_library_key TEXT,
        title TEXT NOT NULL,
        authors JSONB,
        publication_year INTEGER,
        isbn_13 TEXT,
        genres JSONB,
        cover_url TEXT,
        status TEXT DEFAULT 'unread',
        rating INTEGER,
        notes TEXT,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create tags table
    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create book_tags junction table
    await sql`
      CREATE TABLE IF NOT EXISTS book_tags (
        book_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (book_id, tag_id),
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_books_status ON books(user_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    // Don't throw - tables might already exist
  }
}

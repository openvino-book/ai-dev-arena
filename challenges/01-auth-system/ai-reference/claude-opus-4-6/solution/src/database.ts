import Database from 'better-sqlite3';

const db = new Database(':memory:');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    emailVerified INTEGER DEFAULT 0,
    resetToken TEXT,
    resetTokenExpiresAt TEXT,
    verificationToken TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

export default db;

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('oauth_store.sqlite');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  picture TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token_encrypted BLOB NOT NULL,
  refresh_iv BLOB NOT NULL,
  refresh_tag BLOB NOT NULL,
  expiry_date INTEGER,
  scope TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

export function upsertUser({ email, name, picture }) {
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE users SET name = ?, picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, picture, existing.id);
    return existing.id;
  }
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)')
    .run(id, email, name, picture);
  return id;
}

export function upsertTokens({
  userId, provider, accessToken, refreshEncrypted, iv, tag, expiryDate, scope
}) {
  const existing = db.prepare('SELECT * FROM tokens WHERE user_id = ? AND provider = ?')
    .get(userId, provider);
  if (existing) {
    db.prepare(`
      UPDATE tokens
      SET access_token = ?, refresh_token_encrypted = ?, refresh_iv = ?, refresh_tag = ?,
          expiry_date = ?, scope = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(accessToken || null, refreshEncrypted, iv, tag, expiryDate || null, scope || null, existing.id);
    return existing.id;
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO tokens (id, user_id, provider, access_token, refresh_token_encrypted, refresh_iv, refresh_tag, expiry_date, scope)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, provider, accessToken || null, refreshEncrypted, iv, tag, expiryDate || null, scope || null);
    return id;
  }
}

export function getUserById(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getTokensByUserIdProvider(userId, provider) {
  return db.prepare('SELECT * FROM tokens WHERE user_id = ? AND provider = ?').get(userId, provider);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const tokensFile = path.join(dataDir, 'tokens.json');

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  if (!fs.existsSync(tokensFile)) fs.writeFileSync(tokensFile, JSON.stringify([], null, 2));
}

function readJson(file) {
  ensureFiles();
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function upsertUser({ email, name, picture }) {
  const users = readJson(usersFile);
  const existingIdx = users.findIndex(u => u.email === email);
  if (existingIdx !== -1) {
    const existing = users[existingIdx];
    const updated = { ...existing, name, picture, updated_at: new Date().toISOString() };
    users[existingIdx] = updated;
    writeJson(usersFile, users);
    return existing.id;
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  users.push({ id, email, name, picture, created_at: now, updated_at: now });
  writeJson(usersFile, users);
  return id;
}

export function upsertTokens({ userId, provider, accessToken, refreshEncrypted, iv, tag, expiryDate, scope }) {
  const tokens = readJson(tokensFile);
  const existingIdx = tokens.findIndex(t => t.user_id === userId && t.provider === provider);
  const now = new Date().toISOString();
  const record = {
    id: existingIdx !== -1 ? tokens[existingIdx].id : uuidv4(),
    user_id: userId,
    provider,
    access_token: accessToken || null,
    refresh_token_encrypted_b64: Buffer.isBuffer(refreshEncrypted) ? refreshEncrypted.toString('base64') : refreshEncrypted,
    refresh_iv_b64: Buffer.isBuffer(iv) ? iv.toString('base64') : iv,
    refresh_tag_b64: Buffer.isBuffer(tag) ? tag.toString('base64') : tag,
    expiry_date: expiryDate || null,
    scope: scope || null,
    created_at: existingIdx !== -1 ? tokens[existingIdx].created_at : now,
    updated_at: now
  };
  if (existingIdx !== -1) {
    tokens[existingIdx] = record;
  } else {
    tokens.push(record);
  }
  writeJson(tokensFile, tokens);
  return record.id;
}

export function getUserById(userId) {
  const users = readJson(usersFile);
  return users.find(u => u.id === userId) || null;
}

export function getUserByEmail(email) {
  const users = readJson(usersFile);
  return users.find(u => u.email === email) || null;
}

export function getTokensByUserIdProvider(userId, provider) {
  const tokens = readJson(tokensFile);
  return tokens.find(t => t.user_id === userId && t.provider === provider) || null;
}

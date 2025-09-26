import crypto from 'crypto';

const keyBase64 = process.env.ENCRYPTION_KEY_BASE64;
if (!keyBase64) {
  throw new Error('ENCRYPTION_KEY_BASE64 missing in env');
}
const key = Buffer.from(keyBase64, 'base64');
if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes (AES-256 key)');
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decrypt(ciphertext, iv, tag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

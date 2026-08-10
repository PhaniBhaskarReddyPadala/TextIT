'use strict';
/**
 * AES-256-GCM encryption for locked content.
 *
 * Design:
 *  - The server-side ENCRYPTION_KEY is used as the AES key directly.
 *  - A random 96-bit IV is generated per encryption operation.
 *  - The GCM auth tag (16 bytes) ensures integrity.
 *  - The unlock password is verified by the server as a separate access
 *    gate (stored as a bcrypt hash per user). The content is encrypted
 *    with the server key (not derived from the user password) so that
 *    the server can decrypt upon successful unlock.
 *
 * This is a pragmatic design that:
 *  1. Keeps locked content unreadable if DB is compromised (without server key)
 *  2. Requires the user to provide their unlock password to the server,
 *     which then verifies it and decrypts.
 *
 * The unlock password hash is stored in the User document (separate field).
 */
const crypto = require('crypto');
const { ENCRYPTION_KEY } = require('../config/env');

// Convert 64-char hex string to 32-byte Buffer
const KEY = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  });
};

const decrypt = (encryptedString) => {
  let parsed;
  try {
    parsed = JSON.parse(encryptedString);
  } catch {
    throw new Error('Invalid encrypted data format');
  }

  const { iv, authTag, ciphertext } = parsed;

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };

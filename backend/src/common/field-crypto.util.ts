import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * AES-256-CBC field encryption (per-record random IV).
 * Same pattern as vle-credentials; IV prepended as hex:ciphertext.
 */
export function createFieldCrypto(keyEnvName: string, saltEnvName: string) {
  const keyMaterial = process.env[keyEnvName];
  const saltMaterial = process.env[saltEnvName];
  if (!keyMaterial || !saltMaterial) {
    throw new Error(`${keyEnvName} and ${saltEnvName} must be set in environment`);
  }
  const key = crypto.scryptSync(keyMaterial, saltMaterial, 32);

  function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  function decrypt(ciphertext: string): string {
    try {
      if (!ciphertext.includes(':')) {
        const legacyIv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, legacyIv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
      const [ivHex, body] = ciphertext.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(body, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  function maskBankDetails(plaintext: string): string {
    if (!plaintext?.trim()) return '';
    const digits = plaintext.replace(/\s/g, '');
    const last4 = digits.slice(-4);
    return last4 ? `****${last4}` : '****';
  }

  return { encrypt, decrypt, maskBankDetails };
}

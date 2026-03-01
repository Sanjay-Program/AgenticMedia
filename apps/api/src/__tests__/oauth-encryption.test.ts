import { encrypt, decrypt } from '../utils/encryption';

/**
 * Tests for OAuth token encryption/decryption using AES-256-GCM.
 * Validates that third-party tokens (HubSpot, Gmail) are stored securely.
 */
describe('OAuth Token Encryption', () => {
  it('should encrypt and decrypt an access token', () => {
    const accessToken = 'ya29.a0AfH6SMBxyz-test-token-12345';
    const { encrypted, iv, authTag } = encrypt(accessToken);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(accessToken);
  });

  it('should produce different ciphertexts for the same plaintext (random IV)', () => {
    const token = 'same-token-both-times';
    const result1 = encrypt(token);
    const result2 = encrypt(token);
    expect(result1.encrypted).not.toBe(result2.encrypted);
    expect(result1.iv).not.toBe(result2.iv);
  });

  it('should fail decryption with wrong auth tag (tamper detection)', () => {
    const { encrypted, iv } = encrypt('secret-token');
    const badAuthTag = '0'.repeat(32); // 16 bytes as hex
    expect(() => decrypt(encrypted, iv, badAuthTag)).toThrow();
  });

  it('should fail decryption with wrong IV', () => {
    const { encrypted, authTag } = encrypt('secret-token');
    const badIv = '0'.repeat(32); // 16 bytes as hex
    expect(() => decrypt(encrypted, badIv, authTag)).toThrow();
  });

  it('should handle long tokens (refresh tokens)', () => {
    const longToken = 'refresh_' + 'x'.repeat(500);
    const { encrypted, iv, authTag } = encrypt(longToken);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(longToken);
  });

  it('should handle tokens with special characters', () => {
    const specialToken = 'token/with+special=chars&more%20stuff';
    const { encrypted, iv, authTag } = encrypt(specialToken);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(specialToken);
  });
});

import { describe, expect, it } from 'vitest';
import { chatCompletionsUrl, decryptSecret, encryptSecret, validateProviderBaseUrl } from '../lib/crypto';

describe('provider security', () => {
  it('encrypts API keys with a unique IV and decrypts them', async () => {
    const secret = 'a-development-master-secret-over-32-characters';
    const first = await encryptSecret('sk-private', secret);
    const second = await encryptSecret('sk-private', secret);
    expect(first.ciphertext).not.toBe('sk-private');
    expect(first.iv).not.toBe(second.iv);
    expect(await decryptSecret(first.ciphertext, first.iv, secret)).toBe('sk-private');
  });

  it('accepts public HTTPS endpoints and rejects unsafe URLs', () => {
    expect(validateProviderBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1');
    expect(chatCompletionsUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions');
    expect(() => validateProviderBaseUrl('http://api.example.com/v1')).toThrow(/HTTPS/);
    expect(() => validateProviderBaseUrl('https://127.0.0.1/v1')).toThrow(/私人網路/);
    expect(() => validateProviderBaseUrl('https://192.168.1.3/v1')).toThrow(/私人網路/);
  });
});

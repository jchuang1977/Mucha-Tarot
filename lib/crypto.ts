function bytesToBase64(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error('CONFIG_ENCRYPTION_KEY must contain at least 32 characters');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(value: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, await encryptionKey(secret), new TextEncoder().encode(value),
  );
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) };
}

export async function decryptSecret(ciphertext: string, iv: string, secret: string): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) }, await encryptionKey(secret), base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export function validateProviderBaseUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('請輸入有效的 API Base URL'); }
  if (url.protocol !== 'https:') throw new Error('API Base URL 必須使用 HTTPS');
  if (url.username || url.password || url.search || url.hash) throw new Error('API Base URL 不可包含帳密、查詢或片段');

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blockedName = hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local');
  const blockedV4 = /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  const blockedV6 = hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:');
  if (blockedName || blockedV4 || blockedV6) throw new Error('API Base URL 不可指向本機或私人網路');

  return url.toString().replace(/\/$/, '');
}

export function chatCompletionsUrl(baseUrl: string): string {
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

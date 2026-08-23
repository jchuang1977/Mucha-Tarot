import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateReading } from '../lib/provider';
import { tarotDeck } from '../lib/tarot';

const valid = JSON.stringify({
  theme: '今天適合放慢腳步，留意直覺帶來的細微提醒。',
  relationships: '以傾聽代替急著回答，關係會出現更柔軟的空間。',
  workAndMoney: '先整理現有資訊，再做下一步安排，避免倉促決定。',
  action: '為最重要的一件事保留安靜、不受打擾的時間。',
  reminder: '不需要立刻看清全貌，穩定前進本身就是答案。',
});

function providerResponse(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status, headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('AI reading validation', () => {
  it('accepts a complete structured reading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(valid)));
    const reading = await generateReading({
      config: { baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' },
      card: tarotDeck[0], orientation: 'upright', date: '2026-08-23',
    });
    expect(reading.theme).toContain('放慢腳步');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('repairs malformed output once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(providerResponse('not json')).mockResolvedValueOnce(providerResponse(valid)));
    await expect(generateReading({
      config: { baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' },
      card: tarotDeck[1], orientation: 'reversed', date: '2026-08-23',
    })).resolves.toMatchObject({ reminder: expect.any(String) });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects provider and repeated invalid responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('bad')));
    await expect(generateReading({
      config: { baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' },
      card: tarotDeck[2], orientation: 'upright', date: '2026-08-23',
    })).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('', 401)));
    await expect(generateReading({
      config: { baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' },
      card: tarotDeck[2], orientation: 'upright', date: '2026-08-23',
    })).rejects.toThrow(/401/);
  });
});

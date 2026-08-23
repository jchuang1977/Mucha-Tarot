import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateReading, testProvider } from '../lib/provider';
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
  it('tests the structured format instead of accepting any non-empty reply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(valid)));
    await expect(testProvider({ baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' })).resolves.toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('OK')));
    await expect(testProvider({ baseUrl: 'https://api.example.com/v1', model: 'model', apiKey: 'secret' })).rejects.toThrow();
  });

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

  it('disables LongCat thinking and accepts fenced JSON', async () => {
    const request = vi.fn().mockResolvedValue(providerResponse(`說明如下：\n\`\`\`json\n${valid}\n\`\`\``));
    vi.stubGlobal('fetch', request);
    await expect(generateReading({
      config: { baseUrl: 'https://api.longcat.ai/openai/v1', model: 'LongCat-2.0', apiKey: 'secret' },
      card: tarotDeck[0], orientation: 'upright', date: '2026-08-23',
    })).resolves.toMatchObject({ theme: expect.any(String) });
    const body = JSON.parse(request.mock.calls[0][1].body as string);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.max_tokens).toBe(1200);
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

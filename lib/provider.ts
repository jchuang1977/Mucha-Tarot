import { chatCompletionsUrl } from './crypto';
import type { Orientation, ReadingContent, TarotCard } from './types';

export type ProviderConfig = { baseUrl: string; model: string; apiKey: string };
const keys: (keyof ReadingContent)[] = ['theme', 'relationships', 'workAndMoney', 'action', 'reminder'];

class InvalidResponseError extends Error {}

function isLongCat(config: ProviderConfig): boolean {
  try {
    const hostname = new URL(config.baseUrl).hostname.toLowerCase();
    return config.model.toLowerCase().startsWith('longcat-') &&
      (hostname === 'api.longcat.ai' || hostname === 'api.longcat.chat');
  } catch {
    return false;
  }
}

async function providerRequest(config: ProviderConfig, messages: { role: 'system' | 'user'; content: string }[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40_000);
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      stream: false,
      temperature: 0.5,
      max_tokens: 1_200,
    };
    // LongCat defaults may spend most of max_tokens on reasoning_content,
    // leaving the JSON answer truncated. Its official API supports disabling thinking.
    if (isLongCat(config)) body.thinking = { type: 'disabled' };
    const response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Provider request failed with status ${response.status}`);
    const payload = await response.json() as { choices?: { message?: { content?: unknown } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new InvalidResponseError('Provider returned no text');
    return content;
  } finally { clearTimeout(timeout); }
}

function parseReading(raw: string): ReadingContent {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced ?? trimmed;
  const firstBrace = source.indexOf('{');
  const lastBrace = source.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? source.slice(firstBrace, lastBrace + 1) : source;
  let value: unknown;
  try { value = JSON.parse(candidate); } catch { throw new InvalidResponseError('Invalid JSON'); }
  if (!value || typeof value !== 'object') throw new InvalidResponseError('Invalid reading');
  const object = value as Record<string, unknown>;
  if (!keys.every((key) => typeof object[key] === 'string' && (object[key] as string).trim().length >= 8)) {
    throw new InvalidResponseError('Reading fields are missing');
  }
  return Object.fromEntries(keys.map((key) => [key, (object[key] as string).trim()])) as ReadingContent;
}

export async function testProvider(config: ProviderConfig): Promise<void> {
  const content = await providerRequest(config, [
    { role: 'system', content: '你是 API 連線測試。只輸出合法 JSON，不要 Markdown。' },
    { role: 'user', content: '請回傳 theme、relationships、workAndMoney、action、reminder 五個字串欄位，每個欄位至少 8 個繁體中文字。' },
  ]);
  parseReading(content);
}

export async function generateReading(input: {
  config: ProviderConfig; card: TarotCard; orientation: Orientation; date: string;
}): Promise<ReadingContent> {
  const position = input.orientation === 'upright' ? '正位' : '逆位';
  const schema = '{"theme":"...","relationships":"...","workAndMoney":"...","action":"...","reminder":"..."}';
  const system = `你是「暮光塔羅」的解牌者。請用繁體中文，語氣溫柔、具體、可實踐，不做宿命式保證、恐嚇，也不取代醫療、法律或投資等專業建議。只輸出合法 JSON，不要 Markdown。固定結構：${schema}。每個欄位 35 至 70 個中文字。`;
  const user = `日期：${input.date}（Asia/Taipei）\n牌卡：${input.card.nameZh} / ${input.card.nameEn}\n方向：${position}\n請解讀今日主題、感情人際、工作財運、行動建議與今日提醒。`;
  const raw = await providerRequest(input.config, [{ role: 'system', content: system }, { role: 'user', content: user }]);
  try { return parseReading(raw); } catch (error) {
    if (!(error instanceof InvalidResponseError)) throw error;
    const repaired = await providerRequest(input.config, [
      { role: 'system', content: `把內容修正為合法 JSON，只保留這五個字串欄位：${schema}` },
      { role: 'user', content: raw },
    ]);
    return parseReading(repaired);
  }
}

export function isInvalidProviderResponse(error: unknown): boolean {
  return error instanceof InvalidResponseError;
}

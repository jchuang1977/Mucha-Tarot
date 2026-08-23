import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { decryptSecret } from '../../../lib/crypto';
import {
  claimReading, getAiConfig, getReadyReading, pruneReadings, releaseReading, storeReadyReading,
} from '../../../lib/database';
import { generateReading, isInvalidProviderResponse } from '../../../lib/provider';
import { drawTarotCard, findTarotCard, taipeiDate } from '../../../lib/tarot';
import type { Orientation, TarotCard, TarotReading } from '../../../lib/types';

export const dynamic = 'force-dynamic';
const PROMPT_VERSION = 1;

function response(card: TarotCard, orientation: Orientation, date: string, extra: Omit<TarotReading, 'card' | 'orientation' | 'date'>) {
  return NextResponse.json<TarotReading>({
    card: { id: card.id, nameZh: card.nameZh, nameEn: card.nameEn, imageUrl: card.imageUrl },
    orientation, date, ...extra,
  });
}

async function requestedDraw(request: Request): Promise<{ card: TarotCard; orientation: Orientation }> {
  const text = await request.text();
  if (!text) return drawTarotCard();
  try {
    const body = JSON.parse(text) as { cardId?: unknown; orientation?: unknown };
    const card = typeof body.cardId === 'string' ? findTarotCard(body.cardId) : undefined;
    const orientation: Orientation | null = body.orientation === 'upright' || body.orientation === 'reversed' ? body.orientation : null;
    if (card && orientation) return { card, orientation };
  } catch { /* Invalid retry payload falls back to a fresh secure draw. */ }
  return drawTarotCard();
}

export async function POST(request: Request) {
  const { card, orientation } = await requestedDraw(request);
  const date = taipeiDate();
  const config = await getAiConfig();
  if (!config) return response(card, orientation, date, { reading: null, cached: false, error: 'not_configured' });

  const cacheKey = `${date}:${card.id}:${orientation}:c${config.version}:p${PROMPT_VERSION}`;
  const cached = await getReadyReading(cacheKey);
  if (cached) return response(card, orientation, date, { reading: cached, cached: true });

  const claim = await claimReading({ cacheKey, date, cardId: card.id, orientation, configVersion: config.version, promptVersion: PROMPT_VERSION });
  if (claim === 'busy') {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const ready = await getReadyReading(cacheKey);
      if (ready) return response(card, orientation, date, { reading: ready, cached: true });
    }
    return response(card, orientation, date, { reading: null, cached: false, error: 'provider_error' });
  }

  try {
    const apiKey = await decryptSecret(config.api_key_ciphertext, config.api_key_iv, env.CONFIG_ENCRYPTION_KEY);
    const reading = await generateReading({
      config: { baseUrl: config.base_url, model: config.model, apiKey }, card, orientation, date,
    });
    await storeReadyReading(cacheKey, reading);
    await pruneReadings(date);
    return response(card, orientation, date, { reading, cached: false });
  } catch (error) {
    await releaseReading(cacheKey);
    return response(card, orientation, date, {
      reading: null, cached: false, error: isInvalidProviderResponse(error) ? 'invalid_response' : 'provider_error',
    });
  }
}

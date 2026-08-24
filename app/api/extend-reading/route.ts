import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { decryptSecret } from '../../../lib/crypto';
import { getAiConfig } from '../../../lib/database';
import { generateReadingExtension, isInvalidProviderResponse } from '../../../lib/provider';
import { findTarotCard, taipeiDate } from '../../../lib/tarot';
import type { Orientation, ReadingContent } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const sectionKeys: (keyof ReadingContent)[] = ['theme', 'relationships', 'workAndMoney', 'action', 'reminder'];

export async function POST(request: Request) {
  let body: { cardId?: unknown; orientation?: unknown; date?: unknown; section?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'provider_error' }, { status: 400 });
  }

  const card = typeof body.cardId === 'string' ? findTarotCard(body.cardId) : undefined;
  const orientation: Orientation | null = body.orientation === 'upright' || body.orientation === 'reversed' ? body.orientation : null;
  const section = typeof body.section === 'string' && sectionKeys.includes(body.section as keyof ReadingContent)
    ? body.section as keyof ReadingContent : null;
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : taipeiDate();
  if (!card || !orientation || !section) return NextResponse.json({ error: 'provider_error' }, { status: 400 });

  const config = await getAiConfig();
  if (!config) return NextResponse.json({ content: null, error: 'not_configured' });

  try {
    const apiKey = await decryptSecret(config.api_key_ciphertext, config.api_key_iv, env.CONFIG_ENCRYPTION_KEY);
    const content = await generateReadingExtension({
      config: { baseUrl: config.base_url, model: config.model, apiKey }, card, orientation, date, section,
    });
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({
      content: null,
      error: isInvalidProviderResponse(error) ? 'invalid_response' : 'provider_error',
    });
  }
}

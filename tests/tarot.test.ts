import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { drawTarotCard, taipeiDate, tarotDeck } from '../lib/tarot';

describe('tarot deck', () => {
  it('contains all 78 unique cards and assets', () => {
    expect(tarotDeck).toHaveLength(78);
    expect(new Set(tarotDeck.map((card) => card.id)).size).toBe(78);
    expect(tarotDeck.filter((card) => card.suit === 'major')).toHaveLength(22);
    expect(tarotDeck.filter((card) => card.suit !== 'major')).toHaveLength(56);
    for (const card of tarotDeck) expect(existsSync(join(process.cwd(), 'public', card.imageUrl.replace(/^\//, '')))).toBe(true);
  });

  it('draws only known cards and valid orientations', () => {
    for (let index = 0; index < 100; index += 1) {
      const draw = drawTarotCard();
      expect(tarotDeck).toContain(draw.card);
      expect(['upright', 'reversed']).toContain(draw.orientation);
    }
  });

  it('uses the Asia/Taipei calendar date', () => {
    expect(taipeiDate(new Date('2026-08-23T16:30:00.000Z'))).toBe('2026-08-24');
  });
});

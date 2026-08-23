import type { Orientation, TarotCard } from './types';

const majorArcana = [
  ['00-the-fool', '愚者', 'The Fool'], ['01-the-magician', '魔術師', 'The Magician'],
  ['02-the-high-priestess', '女祭司', 'The High Priestess'], ['03-the-empress', '皇后', 'The Empress'],
  ['04-the-emperor', '皇帝', 'The Emperor'], ['05-the-hierophant', '教皇', 'The Hierophant'],
  ['06-the-lovers', '戀人', 'The Lovers'], ['07-the-chariot', '戰車', 'The Chariot'],
  ['08-strength', '力量', 'Strength'], ['09-the-hermit', '隱者', 'The Hermit'],
  ['10-wheel-of-fortune', '命運之輪', 'Wheel of Fortune'], ['11-justice', '正義', 'Justice'],
  ['12-the-hanged-man', '吊人', 'The Hanged Man'], ['13-death', '死神', 'Death'],
  ['14-temperance', '節制', 'Temperance'], ['15-the-devil', '惡魔', 'The Devil'],
  ['16-the-tower', '高塔', 'The Tower'], ['17-the-star', '星星', 'The Star'],
  ['18-the-moon', '月亮', 'The Moon'], ['19-the-sun', '太陽', 'The Sun'],
  ['20-judgement', '審判', 'Judgement'], ['21-the-world', '世界', 'The World'],
] as const;

const suits = [
  ['wands', '權杖', 'Wands'], ['cups', '聖杯', 'Cups'],
  ['swords', '寶劍', 'Swords'], ['pentacles', '錢幣', 'Pentacles'],
] as const;

const ranks = [
  ['ace', '一', 'Ace'], ['two', '二', 'Two'], ['three', '三', 'Three'],
  ['four', '四', 'Four'], ['five', '五', 'Five'], ['six', '六', 'Six'],
  ['seven', '七', 'Seven'], ['eight', '八', 'Eight'], ['nine', '九', 'Nine'],
  ['ten', '十', 'Ten'], ['page', '侍者', 'Page'], ['knight', '騎士', 'Knight'],
  ['queen', '皇后', 'Queen'], ['king', '國王', 'King'],
] as const;

const majorCards: TarotCard[] = majorArcana.map(([slug, nameZh, nameEn]) => ({
  id: `major-${slug.slice(0, 2)}`,
  nameZh,
  nameEn,
  imageUrl: `/assets/tarot/cards/major-arcana/${slug}.webp`,
  suit: 'major',
  rank: slug.slice(0, 2),
}));

const minorCards: TarotCard[] = suits.flatMap(([suit, suitZh, suitEn]) =>
  ranks.map(([rank, rankZh, rankEn]) => ({
    id: `${suit}-${rank}`,
    nameZh: `${suitZh}${rankZh}`,
    nameEn: `${rankEn} of ${suitEn}`,
    imageUrl: `/assets/tarot/cards/minor-arcana/${suit}/${rank}-of-${suit}.webp`,
    suit,
    rank,
  })),
);

export const tarotDeck: readonly TarotCard[] = [...majorCards, ...minorCards];

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) throw new RangeError('maxExclusive must be positive');
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % maxExclusive;
}

export function drawTarotCard(): { card: TarotCard; orientation: Orientation } {
  return {
    card: tarotDeck[secureRandomInt(tarotDeck.length)],
    orientation: secureRandomInt(2) === 0 ? 'upright' : 'reversed',
  };
}

export function findTarotCard(id: string): TarotCard | undefined {
  return tarotDeck.find((card) => card.id === id);
}

export function taipeiDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

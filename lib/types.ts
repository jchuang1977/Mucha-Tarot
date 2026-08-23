export type Orientation = 'upright' | 'reversed';

export type TarotCard = {
  id: string;
  nameZh: string;
  nameEn: string;
  imageUrl: string;
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
  rank: string;
};

export type ReadingContent = {
  theme: string;
  relationships: string;
  workAndMoney: string;
  action: string;
  reminder: string;
};

export type TarotReading = {
  card: Pick<TarotCard, 'id' | 'nameZh' | 'nameEn' | 'imageUrl'>;
  orientation: Orientation;
  date: string;
  reading: ReadingContent | null;
  cached: boolean;
  error?: 'not_configured' | 'provider_error' | 'invalid_response';
};

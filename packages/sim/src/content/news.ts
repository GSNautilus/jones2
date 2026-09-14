import type { NewsSourceId } from '../types';

export type NewsCategory = 'economy' | 'crime' | 'local';

export interface NewsSource {
  id: NewsSourceId;
  name: string;
  price: number;
  minutes: number;
  /** How many weeks ahead this source reports. */
  horizon: number;
  /** Probability each reported week is correct. Wrong reports are off by one week. */
  reliability: number;
  categories: NewsCategory[];
  /** 'newsstand' = bought there; 'tv' = free each week if you own a TV. */
  via: 'newsstand' | 'tv';
}

export const NEWS_SOURCES: Record<NewsSourceId, NewsSource> = {
  daily_bugle: { id: 'daily_bugle', name: 'The Daily Bugle', price: 2, minutes: 15, horizon: 1, reliability: 1, categories: ['economy', 'crime', 'local'], via: 'newsstand' },
  business_weekly: { id: 'business_weekly', name: 'Riverton Business Weekly', price: 10, minutes: 30, horizon: 4, reliability: 0.95, categories: ['economy'], via: 'newsstand' },
  tabloid: { id: 'tabloid', name: 'The Riverton Inquirer', price: 1, minutes: 10, horizon: 3, reliability: 0.5, categories: ['crime', 'local'], via: 'newsstand' },
  tv: { id: 'tv', name: 'Channel 6 News', price: 0, minutes: 0, horizon: 1, reliability: 1, categories: ['economy', 'local'], via: 'tv' },
};

export const NEWS_LIST: NewsSource[] = Object.values(NEWS_SOURCES);

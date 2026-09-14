import type { LocationId, TransportMode } from '@jones2/town';
import type { ItemId } from '../types';

export interface Item {
  id: ItemId;
  name: string;
  price: number;
  store: LocationId;
  /** Weekly comfort points (diminishing returns applied in aggregate). */
  comfort: number;
  /** Fraction of price the pawn shop pays. */
  pawnFactor: number;
  transport?: TransportMode;
  /** Item category for track discounts. */
  category: 'appliance' | 'electronics' | 'furniture' | 'vehicle';
}

export const ITEMS: Record<ItemId, Item> = {
  fridge: { id: 'fridge', name: 'Refrigerator', price: 250, store: 'zmart', comfort: 1, pawnFactor: 0.4, category: 'appliance' },
  microwave: { id: 'microwave', name: 'Microwave', price: 120, store: 'zmart', comfort: 1, pawnFactor: 0.4, category: 'appliance' },
  sofa: { id: 'sofa', name: 'Sofa', price: 150, store: 'zmart', comfort: 2, pawnFactor: 0.3, category: 'furniture' },
  bed: { id: 'bed', name: 'Real Bed', price: 200, store: 'zmart', comfort: 3, pawnFactor: 0.3, category: 'furniture' },
  tv: { id: 'tv', name: 'Television', price: 200, store: 'socket_city', comfort: 3, pawnFactor: 0.5, category: 'electronics' },
  stereo: { id: 'stereo', name: 'Stereo', price: 180, store: 'socket_city', comfort: 3, pawnFactor: 0.5, category: 'electronics' },
  console: { id: 'console', name: 'Game Console', price: 250, store: 'socket_city', comfort: 3, pawnFactor: 0.5, category: 'electronics' },
  computer: { id: 'computer', name: 'Home Computer', price: 600, store: 'socket_city', comfort: 2, pawnFactor: 0.5, category: 'electronics' },
  bicycle: { id: 'bicycle', name: 'Bicycle', price: 120, store: 'auto', comfort: 0, pawnFactor: 0.5, transport: 'bike', category: 'vehicle' },
  used_car: { id: 'used_car', name: 'Used Car', price: 1800, store: 'auto', comfort: 1, pawnFactor: 0.6, transport: 'car', category: 'vehicle' },
};

export const ITEM_LIST: Item[] = Object.values(ITEMS);

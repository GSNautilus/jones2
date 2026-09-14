import type { LocationId, NodeId } from '@jones2/town';
import type { HousingId } from '../types';

export type Amenity = 'kitchen' | 'gym' | 'office' | 'garage';

export interface Housing {
  id: HousingId;
  name: string;
  location: LocationId;
  /** Node the week starts at when this is home. */
  startNode: NodeId;
  kind: 'rent' | 'own';
  /** Weekly rent (rent) or weekly upkeep (own). */
  weekly: number;
  /** Purchase price (own only). */
  price: number;
  comfort: number;
  /** 0..1; theft chance is scaled by (1 - safety). */
  safety: number;
  amenities: Amenity[];
}

export const HOUSING: Record<HousingId, Housing> = {
  shady_acres: { id: 'shady_acres', name: 'Shady Acres', location: 'shady_acres', startNode: 'shady_acres', kind: 'rent', weekly: 45, price: 0, comfort: 0, safety: 0.2, amenities: [] },
  lowcost: { id: 'lowcost', name: 'Low-Cost Housing', location: 'lowcost', startNode: 'lowcost', kind: 'rent', weekly: 80, price: 0, comfort: 1, safety: 0.5, amenities: ['kitchen'] },
  security_apts: { id: 'security_apts', name: 'Security Apartments', location: 'security_apts', startNode: 'security_apts', kind: 'rent', weekly: 160, price: 0, comfort: 3, safety: 1, amenities: ['kitchen'] },
  house_elm: { id: 'house_elm', name: '12 Elm Street', location: 'house_elm', startNode: 'house_elm', kind: 'own', weekly: 30, price: 9000, comfort: 5, safety: 0.9, amenities: ['kitchen', 'garage'] },
  house_lake: { id: 'house_lake', name: 'Lakeside Cottage', location: 'house_lake', startNode: 'house_lake', kind: 'own', weekly: 40, price: 14000, comfort: 7, safety: 1, amenities: ['kitchen', 'office'] },
  house_hill: { id: 'house_hill', name: 'Hilltop Manor', location: 'house_hill', startNode: 'house_hill', kind: 'own', weekly: 60, price: 18000, comfort: 8, safety: 1, amenities: ['kitchen', 'gym', 'office', 'garage'] },
};

export const HOUSING_LIST: Housing[] = Object.values(HOUSING);

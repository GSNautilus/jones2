import type { LocationId } from '@jones2/town';
import type { FoodId } from '../types';

export interface Food {
  id: FoodId;
  name: string;
  location: LocationId;
  price: number;
  minutes: number;
  health: number;
  happiness: number;
}

export const FOODS: Record<FoodId, Food> = {
  burger: { id: 'burger', name: 'Monolith Burger Combo', location: 'monolith', price: 6, minutes: 20, health: -3, happiness: 2 },
  coffee_pastry: { id: 'coffee_pastry', name: 'Coffee and a Danish', location: 'cafe', price: 4, minutes: 15, health: -1, happiness: 2 },
  salad_bar: { id: 'salad_bar', name: 'Salad Bar', location: 'cafe', price: 8, minutes: 25, health: 1, happiness: 1 },
  fine_dining: { id: 'fine_dining', name: 'Seven-Course Tasting Menu', location: 'gilded_fork', price: 30, minutes: 75, health: 4, happiness: 4 },
  feast: { id: 'feast', name: 'The Full Cholesterol', location: 'chez_cholesterol', price: 35, minutes: 90, health: -5, happiness: 8 },
};

export const FOOD_LIST: Food[] = Object.values(FOODS);

/** Groceries: bought by the unit at Black's Market, cooked at home. */
export const GROCERY = { price: 12, shopMinutes: 30, health: 3, happiness: 1 };

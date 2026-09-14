import type { LocationId } from '@jones2/town';
import type { ActivityId } from '../types';

export interface Activity {
  id: ActivityId;
  name: string;
  location: LocationId;
  kind: 'exercise' | 'leisure';
  price: number;
  minutes: number;
  health: number;
  happiness: number;
}

export const ACTIVITIES: Record<ActivityId, Activity> = {
  workout: { id: 'workout', name: 'Weights Session', location: 'gym', kind: 'exercise', price: 10, minutes: 90, health: 4, happiness: 1 },
  swim: { id: 'swim', name: 'Swim Laps', location: 'gym', kind: 'exercise', price: 8, minutes: 60, health: 3, happiness: 2 },
  jog: { id: 'jog', name: 'Jog the River Path', location: 'park', kind: 'exercise', price: 0, minutes: 60, health: 3, happiness: 2 },
  stroll: { id: 'stroll', name: 'Feed the Geese', location: 'park', kind: 'leisure', price: 0, minutes: 45, health: 1, happiness: 3 },
  movie: { id: 'movie', name: 'Catch a Movie', location: 'cinema', kind: 'leisure', price: 9, minutes: 120, health: 0, happiness: 6 },
  view: { id: 'view', name: 'Take in the View', location: 'lookout', kind: 'leisure', price: 0, minutes: 30, health: 1, happiness: 5 },
};

export const ACTIVITY_LIST: Activity[] = Object.values(ACTIVITIES);

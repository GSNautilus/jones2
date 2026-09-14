import type { AchievementId, GameState, ItemId, PlayerState, TrackId } from '../types';
import { JOBS } from './jobs';

export interface Reward {
  cash?: number;
  happiness?: number;
  item?: ItemId;
  /** Extra minutes next week. */
  minutes?: number;
}

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  check: (p: PlayerState, s: GameState) => boolean;
  reward: Reward;
}

function hasRung(p: PlayerState, track: TrackId, rung: number): boolean {
  if (!p.job) return false;
  const j = JOBS[p.job.jobId]!;
  return j.track === track && j.rung >= rung;
}

const TRACK_NAMES: Record<TrackId, string> = {
  service: 'Service',
  trades: 'Trades',
  tech: 'Tech',
  finance: 'Finance',
  academia: 'Academia',
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'explorer', name: 'Explorer', description: 'First to reach Lookout Point.', check: (p) => p.visited.includes('lookout'), reward: { item: 'bicycle' } },
  { id: 'wheels', name: 'Wheels', description: 'First to own a car.', check: (p) => p.items.includes('used_car'), reward: { cash: 200 } },
  { id: 'homeowner', name: 'Homeowner', description: 'First to buy a house.', check: (p) => p.properties.length > 0, reward: { happiness: 10 } },
  { id: 'graduate', name: 'Graduate', description: 'First to complete any degree.', check: (p) => p.degrees.length > 0, reward: { cash: 150 } },
  ...(['service', 'trades', 'tech', 'finance', 'academia'] as TrackId[]).map((t) => ({
    id: `climber_${t}`,
    name: `${TRACK_NAMES[t]} Climber`,
    description: `First to reach rung 3 in ${TRACK_NAMES[t]}.`,
    check: (p: PlayerState) => hasRung(p, t, 3),
    reward: { cash: 300 },
  })),
  { id: 'nest_egg', name: 'Nest Egg', description: 'First to hold $3,000 in savings.', check: (p) => p.savings >= 3000, reward: { cash: 200 } },
  { id: 'iron', name: 'Iron Constitution', description: 'First to reach 100 health.', check: (p) => p.health >= 100, reward: { minutes: 300 } },
  { id: 'dressed', name: 'Dressed for Success', description: 'First to own executive clothing.', check: (p) => p.clothing.tier >= 3, reward: { happiness: 5, cash: 100 } },
];

export const ACHIEVEMENT_MAP: Record<AchievementId, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

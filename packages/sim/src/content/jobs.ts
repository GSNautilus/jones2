import type { LocationId } from '@jones2/town';
import type { DegreeId, JobId, TrackId } from '../types';

export interface Job {
  id: JobId;
  title: string;
  track: TrackId;
  /** 1..4 */
  rung: number;
  employer: LocationId;
  /** Dollars per hour before wageIndex. */
  wage: number;
  shiftMinutes: number;
  degrees: DegreeId[];
  /** Weeks of experience required in this track. */
  experience: number;
  /** Minimum effective clothing tier. */
  clothing: number;
  /** Happiness per shift (usually negative). */
  happiness: number;
  /** Health per shift. */
  health: number;
  /** 0..1, chance of surviving a layoff event in this track. */
  stability: number;
  openings: number;
  /** Career score when held, 0..100. */
  prestige: number;
}

export const TRACKS: Record<TrackId, { name: string; perk: string }> = {
  service: { name: 'Service', perk: 'Food discount at your employer' },
  trades: { name: 'Trades', perk: 'Cheaper appliances at Z-Mart' },
  tech: { name: 'Tech', perk: 'Cheaper electronics at Socket City' },
  finance: { name: 'Finance', perk: 'Better savings interest' },
  academia: { name: 'Academia', perk: 'Cheaper tuition' },
};

const PRESTIGE = [0, 25, 50, 75, 100];
const OPENINGS = [0, 4, 2, 1, 1];

function job(
  id: JobId,
  title: string,
  track: TrackId,
  rung: number,
  employer: LocationId,
  wage: number,
  opts: Partial<Pick<Job, 'shiftMinutes' | 'degrees' | 'experience' | 'clothing' | 'happiness' | 'health' | 'stability'>> = {},
): Job {
  return {
    id,
    title,
    track,
    rung,
    employer,
    wage,
    shiftMinutes: opts.shiftMinutes ?? 480,
    degrees: opts.degrees ?? [],
    experience: opts.experience ?? 0,
    clothing: opts.clothing ?? 0,
    happiness: opts.happiness ?? -2,
    health: opts.health ?? 0,
    stability: opts.stability ?? 0.5,
    openings: OPENINGS[rung]!,
    prestige: PRESTIGE[rung]!,
  };
}

export const JOBS: Record<JobId, Job> = Object.fromEntries(
  [
    // Service
    job('fry_cook', 'Fry Cook', 'service', 1, 'monolith', 6, { happiness: -3, health: -1, stability: 0.6 }),
    job('barista', 'Barista', 'service', 1, 'cafe', 6.5, { happiness: -2, stability: 0.6 }),
    job('orderly', 'Orderly', 'service', 1, 'clinic', 7.5, { happiness: -3, health: -1, stability: 0.8 }),
    job('sales_clerk', 'Sales Clerk', 'service', 2, 'zmart', 8, { clothing: 1, experience: 3, stability: 0.5 }),
    job('sales_associate', 'Sales Associate', 'service', 2, 'qt_clothing', 8.5, { clothing: 2, experience: 3, happiness: -1 }),
    job('waiter', 'Waiter', 'service', 2, 'gilded_fork', 9, { clothing: 1, experience: 2, happiness: -2 }),
    job('shift_manager', 'Shift Manager', 'service', 3, 'monolith', 13, { experience: 8, clothing: 1, happiness: -3, stability: 0.7 }),
    job('store_manager', 'Store Manager', 'service', 3, 'zmart', 14, { degrees: ['business_admin'], experience: 6, clothing: 2, stability: 0.7 }),
    job('restaurant_manager', 'Restaurant Manager', 'service', 4, 'chez_cholesterol', 20, { degrees: ['business_admin'], experience: 14, clothing: 2, happiness: -2, stability: 0.8 }),

    // Trades
    job('assembler', 'Assembly Line', 'trades', 1, 'factory', 7.5, { happiness: -4, health: -2, stability: 0.4 }),
    job('machinist', 'Machinist', 'trades', 2, 'factory', 11, { degrees: ['trade_school'], happiness: -3, health: -1, stability: 0.5 }),
    job('foreman', 'Foreman', 'trades', 3, 'factory', 16, { degrees: ['trade_school'], experience: 10, happiness: -2, stability: 0.7 }),
    job('plant_engineer', 'Plant Engineer', 'trades', 4, 'factory', 24, { degrees: ['engineering'], experience: 12, clothing: 1, happiness: -1, stability: 0.9 }),

    // Tech
    job('tech_support', 'Tech Support', 'tech', 1, 'socket_city', 8, { happiness: -3, stability: 0.5 }),
    job('repair_tech', 'Repair Technician', 'tech', 2, 'socket_city', 12, { degrees: ['electronics'], happiness: -1, stability: 0.6 }),
    job('med_tech', 'Medical Technician', 'tech', 3, 'clinic', 17, { degrees: ['electronics'], experience: 6, clothing: 1, stability: 0.9 }),
    job('programmer', 'Programmer', 'tech', 3, 'socket_city', 18, { degrees: ['computer_science'], experience: 4, happiness: -1, stability: 0.6 }),
    job('architect', 'Systems Architect', 'tech', 4, 'socket_city', 28, { degrees: ['computer_science', 'engineering'], experience: 12, clothing: 1, stability: 0.8 }),

    // Finance
    job('teller', 'Teller', 'finance', 1, 'bank', 8, { clothing: 1, happiness: -2, stability: 0.7 }),
    job('loan_officer', 'Loan Officer', 'finance', 2, 'bank', 13, { degrees: ['business_admin'], clothing: 2, experience: 3, stability: 0.7 }),
    job('analyst', 'Investment Analyst', 'finance', 3, 'bank', 20, { degrees: ['finance'], clothing: 2, experience: 8, happiness: -3, stability: 0.5 }),
    job('branch_manager', 'Branch Manager', 'finance', 4, 'bank', 30, { degrees: ['finance', 'business_admin'], clothing: 3, experience: 14, happiness: -2, stability: 0.8 }),

    // Academia
    job('library_aide', 'Library Aide', 'academia', 1, 'university', 7, { happiness: 0, stability: 0.8, shiftMinutes: 360 }),
    job('teaching_assistant', 'Teaching Assistant', 'academia', 2, 'university', 11, { degrees: ['liberal_arts'], happiness: -1, stability: 0.8, shiftMinutes: 360 }),
    job('lecturer', 'Lecturer', 'academia', 3, 'university', 17, { degrees: ['masters'], experience: 6, clothing: 1, happiness: 0, stability: 0.9, shiftMinutes: 360 }),
    job('professor', 'Professor', 'academia', 4, 'university', 26, { degrees: ['doctorate'], experience: 12, clothing: 1, happiness: 1, stability: 0.95, shiftMinutes: 360 }),
  ].map((j) => [j.id, j]),
);

export const JOB_LIST: Job[] = Object.values(JOBS);

import type { DegreeId, TrackId } from '../types';

export interface Degree {
  id: DegreeId;
  name: string;
  /** Track this degree mainly serves; general degrees have none. */
  track: TrackId | null;
  /** Classes (credits) needed to complete. */
  classes: number;
  classMinutes: number;
  tuition: number;
  prereqs: DegreeId[];
}

export const DEGREES: Record<DegreeId, Degree> = {
  trade_school: { id: 'trade_school', name: 'Trade School Certificate', track: 'trades', classes: 4, classMinutes: 240, tuition: 60, prereqs: [] },
  business_admin: { id: 'business_admin', name: 'Business Administration', track: null, classes: 5, classMinutes: 240, tuition: 80, prereqs: [] },
  electronics: { id: 'electronics', name: 'Electronics Certificate', track: 'tech', classes: 4, classMinutes: 240, tuition: 70, prereqs: [] },
  computer_science: { id: 'computer_science', name: 'Computer Science', track: 'tech', classes: 6, classMinutes: 240, tuition: 100, prereqs: ['electronics'] },
  engineering: { id: 'engineering', name: 'Engineering', track: null, classes: 8, classMinutes: 300, tuition: 120, prereqs: [] },
  finance: { id: 'finance', name: 'Finance', track: 'finance', classes: 6, classMinutes: 240, tuition: 110, prereqs: ['business_admin'] },
  liberal_arts: { id: 'liberal_arts', name: 'Liberal Arts', track: 'academia', classes: 4, classMinutes: 200, tuition: 60, prereqs: [] },
  masters: { id: 'masters', name: "Master's Degree", track: 'academia', classes: 6, classMinutes: 300, tuition: 140, prereqs: ['liberal_arts'] },
  doctorate: { id: 'doctorate', name: 'Doctorate', track: 'academia', classes: 8, classMinutes: 300, tuition: 180, prereqs: ['masters'] },
};

export const DEGREE_LIST: Degree[] = Object.values(DEGREES);
export const TOTAL_CREDITS = DEGREE_LIST.reduce((s, d) => s + d.classes, 0);

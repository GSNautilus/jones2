import { chance, nextInt, pick, type RngState } from '../rng';
import type { ScheduledEvent, TrackId } from '../types';

const TRACKS: TrackId[] = ['service', 'trades', 'tech', 'finance', 'academia'];
const TRACK_NAMES: Record<TrackId, string> = {
  service: 'service sector',
  trades: 'manufacturing',
  tech: 'tech firms',
  finance: 'banks',
  academia: 'the university',
};
const SALE_STORES = ['zmart', 'socket_city', 'qt_clothing', 'auto'] as const;
const SALE_NAMES: Record<(typeof SALE_STORES)[number], string> = {
  zmart: 'Z-Mart',
  socket_city: 'Socket City',
  qt_clothing: 'QT Clothing',
  auto: "Honest Al's",
};

type Template = (rng: RngState, week: number, n: number) => [RngState, ScheduledEvent];

const TEMPLATES: Template[] = [
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Economy booms; employers raise wages', effect: { kind: 'wage', delta: 0.1, weeks: 4 }, categories: ['economy'] }],
  (r, week, n) => {
    const [r2, t] = pick(r, TRACKS);
    return [r2, { id: `e${n}`, week, headline: `Recession bites; layoffs expected at ${TRACK_NAMES[t]}`, effect: { kind: 'layoffs', track: t }, categories: ['economy'] }];
  },
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Wages slump as economy cools', effect: { kind: 'wage', delta: -0.1, weeks: 4 }, categories: ['economy'] }],
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Prices spike on supply shortages', effect: { kind: 'price', delta: 0.15, weeks: 3 }, categories: ['economy'] }],
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Retailers slash prices to clear stock', effect: { kind: 'price', delta: -0.1, weeks: 3 }, categories: ['economy', 'local'] }],
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Landlords announce rent increases', effect: { kind: 'rent', delta: 0.15, weeks: 6 }, categories: ['economy', 'local'] }],
  (r, week, n) => [r, { id: `e${n}`, week, headline: 'Police warn of a burglary wave', effect: { kind: 'crime', delta: 0.2, weeks: 3 }, categories: ['crime', 'local'] }],
  (r, week, n) => {
    const [r2, s] = pick(r, SALE_STORES);
    return [r2, { id: `e${n}`, week, headline: `${SALE_NAMES[s]} announces a one-week sale`, effect: { kind: 'sale', location: s, discount: 0.25 }, categories: ['local'] }];
  },
];

/** Generate the full event schedule for a game up front. */
export function generateSchedule(rng: RngState, weeks: number): [RngState, ScheduledEvent[]] {
  const events: ScheduledEvent[] = [];
  let r = rng;
  let week = 2;
  let n = 1;
  while (week <= weeks) {
    let hit: boolean;
    [r, hit] = chance(r, 0.6);
    if (hit) {
      let tmpl: Template;
      [r, tmpl] = pick(r, TEMPLATES);
      let ev: ScheduledEvent;
      [r, ev] = tmpl(r, week, n++);
      events.push(ev);
    }
    let gap: number;
    [r, gap] = nextInt(r, 1, 2);
    week += gap;
  }
  return [r, events];
}

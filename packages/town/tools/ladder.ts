/**
 * The hour ladder, printed. The classic ruleset charges whole hours per trip,
 * so the map is tuned in hour bands rather than minutes; this prints the
 * pairwise walking table between the thirteen classic locations, grouped by
 * wedge, and lists every pair that lands in the wrong band.
 *
 *   npx tsx packages/town/tools/ladder.ts
 *
 * The bands are the ones `test/scheme.test.ts` asserts.
 */
import { TownGraph, routeHours } from '../src/graph';
import type { Town } from '../src/types';
import town from '../src/towns/riverton.json';

const WEDGES = {
  centre: ['employment', 'monolith', 'rent_office'],
  mill: ['factory', 'lowcost'],
  strip: ['zmart', 'blacks_market', 'pawn'],
  uptown: ['bank', 'qt_clothing', 'socket_city'],
  campus: ['university', 'security_apts'],
} as const;
type Wedge = keyof typeof WEDGES;

const HOURS: Record<Wedge, Record<Wedge, number>> = {
  centre: { centre: 1, mill: 2, strip: 2, uptown: 1, campus: 1 },
  mill: { centre: 2, mill: 1, strip: 2, uptown: 3, campus: 3 },
  strip: { centre: 2, mill: 2, strip: 1, uptown: 3, campus: 3 },
  uptown: { centre: 1, mill: 3, strip: 3, uptown: 1, campus: 2 },
  campus: { centre: 1, mill: 3, strip: 3, uptown: 2, campus: 1 },
};

const T = town as unknown as Town;
const g = new TownGraph(T);
const CLASSIC = Object.values(WEDGES).flat() as string[];
const wedgeOf = new Map<string, Wedge>();
for (const [w, locs] of Object.entries(WEDGES)) for (const l of locs) wedgeOf.set(l, w as Wedge);

const nodeOf = (loc: string) => {
  const n = g.nodeForLocation(loc);
  if (!n) throw new Error(`no node for location ${loc}`);
  return n;
};

const short = (id: string) => id.slice(0, 7).padEnd(7);

const minutes = new Map<string, number>();
for (const a of CLASSIC) {
  for (const b of CLASSIC) {
    if (a === b) continue;
    const r = g.route(nodeOf(a).id, nodeOf(b).id, 'walk');
    minutes.set(`${a}|${b}`, r ? r.minutes : Infinity);
  }
}

console.log('walking minutes (hours in brackets)\n');
console.log('        ' + CLASSIC.map(short).join(''));
for (const a of CLASSIC) {
  const row = CLASSIC.map((b) => {
    if (a === b) return '   -   ';
    const m = minutes.get(`${a}|${b}`)!;
    return `${String(m).padStart(3)}/${routeHours(m)}h `;
  });
  console.log(short(a) + ' ' + row.join(''));
}

console.log('\nstart node:', T.startNode);
for (const c of WEDGES.centre) {
  const r = g.route(T.startNode, nodeOf(c).id, 'walk');
  console.log(`  -> ${short(c)} ${r ? `${r.minutes} min (${routeHours(r.minutes)}h)` : 'unreachable'}`);
}

const wrong: string[] = [];
for (let i = 0; i < CLASSIC.length; i++) {
  for (let j = i + 1; j < CLASSIC.length; j++) {
    const a = CLASSIC[i]!;
    const b = CLASSIC[j]!;
    const m = minutes.get(`${a}|${b}`)!;
    const want = HOURS[wedgeOf.get(a)!][wedgeOf.get(b)!];
    const got = routeHours(m);
    if (got !== want) wrong.push(`${a} -> ${b} (${wedgeOf.get(a)}/${wedgeOf.get(b)}): ${got}h (${m} min), wanted ${want}h`);
  }
}

console.log('');
if (!wrong.length) console.log('every pair lands in its band');
else {
  console.log(`${wrong.length} offenders:`);
  for (const w of wrong) console.log('  ' + w);
}

// Band summary: how much slack is left at each boundary.
const groups = new Map<string, number[]>();
for (let i = 0; i < CLASSIC.length; i++) {
  for (let j = i + 1; j < CLASSIC.length; j++) {
    const a = CLASSIC[i]!;
    const b = CLASSIC[j]!;
    const key = [wedgeOf.get(a)!, wedgeOf.get(b)!].sort().join('-');
    const list = groups.get(key) ?? [];
    list.push(minutes.get(`${a}|${b}`)!);
    groups.set(key, list);
  }
}
console.log('\nband ranges (min..max minutes, target hours):');
for (const [key, list] of [...groups].sort()) {
  const [x, y] = key.split('-') as [Wedge, Wedge];
  console.log(
    `  ${key.padEnd(16)} ${String(Math.min(...list)).padStart(4)}..${String(Math.max(...list)).padEnd(4)}  want ${HOURS[x][y]}h (<=${HOURS[x][y] * 60}, >${(HOURS[x][y] - 1) * 60})`,
  );
}

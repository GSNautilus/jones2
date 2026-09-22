/**
 * Which extracted sound plays for which game moment. The sounds are known by
 * number (their resource number in the original game) and by the names given
 * on the audition page, kept in `assets/sierra/audio/names.json` as `{ "23": "cash
 * register", ... }`. This module turns those names into the map the game
 * uses, by keyword, so renaming a sound is enough to re-wire it; an explicit
 * `overrides` block in the same file wins over the keywords.
 *
 * Pure: no DOM, no fetch, so the matching is testable.
 */

/** The moments the game can make a sound for. */
export type SfxKey =
  | 'cash' // money changes hands: a work session paid, a purchase, rent
  | 'hired'
  | 'refused'
  | 'buy'
  | 'study'
  | 'graduate' // a stinger: the music ducks for it
  | 'travel'
  | 'door' // a location window opens
  | 'university' // a stinger when the Hi-Tech U window opens
  | 'weekend' // the "Oh What a Weekend" card
  | 'startTurn' // a stinger at the first card of a player's week
  | 'card' // any other start-of-week card
  | 'starving'
  | 'sick'
  | 'robbed'
  | 'rentDue'
  | 'clothes'
  | 'economyBad'
  | 'economyGood'
  | 'timesUp'
  | 'endWeek'
  | 'cannot' // an action the game refused (no time, no money…)
  | 'win'
  | 'click'
  | 'theme' // a stinger when a new game begins
  | 'newGame' // the setup screen
  | 'shady';

export const SFX_KEYS: SfxKey[] = [
  'cash', 'hired', 'refused', 'buy', 'study', 'graduate', 'travel', 'door', 'university', 'weekend', 'startTurn',
  'card', 'starving', 'sick', 'robbed', 'rentDue', 'clothes', 'economyBad', 'economyGood', 'timesUp', 'endWeek',
  'cannot', 'win', 'click', 'theme', 'newGame', 'shady',
];

/** Moments that are music in their own right: the rotation ducks while they play. */
export const STINGERS: ReadonlySet<SfxKey> = new Set<SfxKey>(['graduate', 'university', 'startTurn', 'theme', 'newGame']);

/** Stingers that belong to a place: they stop, quickly, when the player leaves it. */
export const PLACE_STINGERS: ReadonlySet<SfxKey> = new Set<SfxKey>(['university']);

/** Keywords in a sound's name that put it under a key; first match wins. */
const KEYWORDS: Array<[SfxKey, RegExp]> = [
  ['cash', /cash|register|till|money|pay/i],
  ['hired', /hired|hire|new job|got the job/i],
  ['refused', /refus|reject|denied|no opening|fail/i],
  ['buy', /buy|purchase|shop|bought/i],
  ['graduate', /graduat|degree|diploma/i],
  ['study', /study|lesson|class|school/i],
  ['travel', /travel|walk|footstep|bus|car/i],
  ['door', /door|enter|bell|chime|open/i],
  ['weekend', /weekend/i],
  ['startTurn', /start of turn|turn start|new turn|new week/i],
  ['starving', /hungry|starv|forgot to eat|no food/i],
  ['sick', /sick|ill|doctor/i],
  ['robbed', /robbed|robbery|mugg|thief|willy/i],
  ['rentDue', /rent/i],
  ['clothes', /cloth|uniform|wardrobe/i],
  ['economyBad', /bad econom|crash|recession|slump/i],
  ['economyGood', /good econom|boom|upturn/i],
  ['timesUp', /time.?s up|out of time|no time/i],
  ['cannot', /can.?t|cannot|not allowed|denied|error|nope/i],
  ['card', /card|notice|event|news/i],
  ['endWeek', /end.?week|week.?end|end of week|turn end|clock/i],
  ['win', /win|victory|fanfare|goal/i],
  ['click', /click|select|button|menu/i],
  ['newGame', /new game|title|setup|menu screen/i],
  ['shady', /shady/i],
];

/** Names that mark a piece as background music. */
const MUSIC = /music|theme|song|tune|bgm|background/i;

export interface NamesFile {
  /** Sound number -> the name given on the audition page. */
  [number: string]: string | { [key: string]: unknown } | undefined;
  /** Optional explicit assignments: sfx key -> sound number(s); "music" -> numbers. */
  overrides?: { [key: string]: number | number[] };
}

export interface SoundMap {
  /** One or more candidate sounds per moment; the player picks one at random. */
  sfx: Partial<Record<SfxKey, number[]>>;
  /** The background music rotation, in resource numbers. */
  music: number[];
  /** Sounds that were named but matched nothing, for the report. */
  unmatched: Array<{ number: number; name: string }>;
}

export function resolveMap(names: NamesFile): SoundMap {
  const sfx: Partial<Record<SfxKey, number[]>> = {};
  const music: number[] = [];
  const unmatched: SoundMap['unmatched'] = [];
  const add = (key: SfxKey, n: number) => {
    (sfx[key] ??= []).push(n);
  };

  for (const [k, v] of Object.entries(names)) {
    if (k === 'overrides' || typeof v !== 'string') continue;
    const number = Number(k);
    if (!Number.isFinite(number)) continue;
    const name = v.trim();
    if (!name) continue;
    if (MUSIC.test(name)) {
      music.push(number);
      continue;
    }
    const hit = KEYWORDS.find(([, re]) => re.test(name));
    if (hit) add(hit[0], number);
    else unmatched.push({ number, name });
  }

  const overrides = names.overrides ?? {};
  for (const [key, val] of Object.entries(overrides)) {
    const list = Array.isArray(val) ? val : [val];
    if (key === 'music') {
      music.splice(0, music.length, ...list);
    } else if ((SFX_KEYS as string[]).includes(key)) {
      sfx[key as SfxKey] = list;
    }
  }

  return { sfx, music: [...new Set(music)].sort((a, b) => a - b), unmatched };
}

export function fileFor(number: number): string {
  return `audio/ogg/sound_${String(number).padStart(3, '0')}.ogg`;
}

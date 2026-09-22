/**
 * The clerks' spoken lines from the CD-ROM edition, by number. The labelling
 * lives in `assets/sierra/audio/voices.json` (written by `tools/sci`'s matching
 * pass, see docs/VOICES.md): which line numbers are each location's greetings,
 * in the wiki's order, and which are its responses, grouped as the wiki
 * groups them ("Bought an Item", "Pay Rent", "Got the Job"…). This module
 * picks a line for a moment. Pure: no DOM, no fetch.
 */
import type { PlayerEvent } from '@jones2/sim';

export interface VoicesFile {
  /** Sample rate the lines were extracted at; informational. */
  rate: number;
  /** location id -> line numbers, index i = greeting i of CLASSIC_LOCATIONS[loc].greetings. */
  greetings: Record<string, number[]>;
  /** location id -> quote group -> line numbers. */
  quotes: Record<string, Record<string, number[]>>;
  /** Start-of-week card lines: the weekend texts and the headlines, with the text each one speaks. */
  cards: Record<string, CardLine[]>;
  /** Lines nobody has labelled yet. */
  unresolved: number[];
}

export interface CardLine {
  line: number;
  text: string;
}

export const EMPTY_VOICES: VoicesFile = { rate: 11025, greetings: {}, quotes: {}, cards: {}, unresolved: [] };

/** Lower-case letters and digits only, so punctuation and line breaks never spoil a match. */
export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** How alike two texts are: the share of the shorter one's words the other has. */
function wordOverlap(a: string, b: string): number {
  const wa = new Set(a.split(' '));
  const wb = new Set(b.split(' '));
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  let hit = 0;
  for (const w of small) if (big.has(w)) hit++;
  return small.size ? hit / small.size : 0;
}

/** Below this share of shared words a card text and a recorded line are different texts. */
export const CARD_MATCH = 0.85;

/**
 * The spoken line for a start-of-week card, found by its text: the card's
 * text contains the weekend sentence or the headline the CD recorded, or
 * nearly does (the wiki's wording of a few weekends drops a word).
 */
export function cardLine(v: VoicesFile, kind: string, text: string): number | null {
  const lines = v.cards[kind];
  if (!lines || lines.length === 0) return null;
  const hay = normalizeText(text);
  let best: CardLine | null = null;
  let bestScore = 0;
  for (const c of lines) {
    const needle = normalizeText(c.text);
    if (!needle) continue;
    const score = hay.includes(needle) ? 1 + needle.length / 1000 : wordOverlap(hay, needle);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best && bestScore >= CARD_MATCH ? best.line : null;
}

export function voiceFile(line: number): string {
  return `audio/voice/line_${String(line).padStart(3, '0')}.ogg`;
}

/** The line for greeting `index` at `loc`, or null when it has no voice. */
export function greetingLine(v: VoicesFile, loc: string, index: number): number | null {
  const lines = v.greetings[loc];
  if (!lines || lines.length === 0) return null;
  return lines[((index % lines.length) + lines.length) % lines.length] ?? null;
}

/**
 * The `n`th response of a quote group at `loc`, rotating through the group so
 * repeated purchases hear different lines. Null when the group has no voice.
 */
export function quoteLine(v: VoicesFile, loc: string, group: string, n: number): number | null {
  const lines = v.quotes[loc]?.[group];
  if (!lines || lines.length === 0) return null;
  return lines[((n % lines.length) + lines.length) % lines.length] ?? null;
}

/**
 * Which quote groups a logged action's outcome belongs to, in the order the
 * clerk says them, by action type and the outcome text where one action can
 * end two ways (as `sfxForEvent` does). The group names are the wiki's
 * subheadings where it has them, and the CD's own responses otherwise (see
 * docs/VOICES.md). Empty when the clerk has nothing to say.
 */
export function quoteGroupsFor(ev: PlayerEvent): string[] {
  const t = ev.action.type as string;
  const text = ev.text ?? '';
  if (t.startsWith('buy')) return ['Bought an Item'];
  switch (t) {
    case 'work':
      return /fired/i.test(text) ? ['Fired'] : [];
    case 'apply': {
      if (/^hired/i.test(text)) return ['Got the Job'];
      if (/no openings/i.test(text)) return ['No Openings'];
      const reasons: string[] = [];
      if (/education/i.test(text)) reasons.push('Not Enough Education');
      if (/experience/i.test(text)) reasons.push('Not Enough Experience');
      if (/dependability/i.test(text)) reasons.push('Poor Work History');
      return ['Not Hired', ...reasons];
    }
    case 'raise':
      return [/raise to/i.test(text) ? 'Raise Approved' : 'Raise Rejected'];
    case 'payRent':
      return ['Pay Rent'];
    case 'rentExtension':
      return [/approved/i.test(text) ? 'Extension Approved' : 'Extension Rejected'];
    case 'rent':
      return [/Security/i.test(text) ? 'Renting Security Apartment' : 'Renting Low-Cost Housing'];
    case 'bank':
      return [/^withdrew/i.test(text) ? 'Withdrawing Cash' : 'Depositing Cash'];
    case 'applyLoan':
      return [/lent you/i.test(text) ? 'Loan Approved' : 'Loan Rejected'];
    case 'loanPayment':
      return ['Loan Payment'];
    case 'enroll':
      return ['Enrolled'];
    case 'pawnItem':
    case 'redeemItem':
      return ['Thanks'];
    case 'lottery':
    case 'newspaper':
      return ['Bought an Item'];
    default:
      // work, class, relax, travel, broker, sellStock, endWeek: the clerk says nothing
      return [];
  }
}

/** The first group of `quoteGroupsFor`, for callers that want one line. */
export function quoteGroupFor(ev: PlayerEvent): string | null {
  return quoteGroupsFor(ev)[0] ?? null;
}

/** Which "no time" line fits the action that was refused. */
const NO_TIME: Record<string, string> = {
  work: 'No Time to Work',
  class: 'No Time for Class',
  applyLoan: 'No Time for Loan',
  broker: 'No Time for Broker',
  relax: 'No Time to Relax',
  newspaper: 'No Time for News',
};

/**
 * The group for a refusal the sim made before anything happened ("Not enough
 * cash", "Not enough time", "Needs casual clothes"): the clerk has a line for
 * each, and the no-time line names what there was no time for.
 */
export function refusalGroupFor(reason: string, actionType?: string): string | null {
  if (/cash|money|afford/i.test(reason)) return 'Not Enough Cash';
  if (/time/i.test(reason)) return (actionType && NO_TIME[actionType]) ?? 'No Time';
  if (/clothes|dressed|uniform/i.test(reason)) return 'Not Dressed';
  return null;
}

/**
 * The location window's contents, built straight from the sim's action surface.
 *
 * `availableActions` already returns every action for where the player stands,
 * with `enabled`, a `reason` when it is not, the cash `cost` and the `minutes`
 * it charges. This module only decides what is a MENU ROW (a priced line, as in
 * the original's item lists) and what is a BUTTON along the bottom (the verbs:
 * WORK, RELAX, RAISE...), and splits the sim's label into name / price / note
 * so the row can be set with a dotted leader.
 */
import { availableActions, type Action, type ActionOption, type GameState } from '@jones2/sim';
import type { PanelModel } from './layout';
import { greetingFor, locationName, portraitFor } from './locations';

/** Action types that become buttons along the bottom of the window, in this order. */
export const BUTTON_ACTIONS: { type: Action['type']; label: string }[] = [
  { type: 'work', label: 'WORK' },
  { type: 'relax', label: 'RELAX' },
  { type: 'raise', label: 'RAISE' },
  { type: 'broker', label: 'BROKER' },
  { type: 'payRent', label: 'PAY RENT' },
  { type: 'rentExtension', label: 'EXTEND' },
  { type: 'applyLoan', label: 'LOAN' },
  { type: 'loanPayment', label: 'PAY LOAN' },
  { type: 'lottery', label: 'LOTTERY' },
  { type: 'newspaper', label: 'NEWS' },
];

/** Never shown inside the window: travel is the map's job, End Week is the bar's. */
const HIDDEN: ReadonlySet<string> = new Set(['travel', 'endWeek']);

export interface SplitLabel {
  /** The label with its trailing parenthetical removed. */
  text: string;
  /** A money amount found in that parenthetical, e.g. "$73" or "+$32". */
  money: string;
  /** Whatever else was in the parenthetical, e.g. "6 weeks" or "2/10". */
  note: string;
}

const MONEY = /^[+-]?\$[\d,]+(?:\.\d+)?(?:\/H)?$/i;

/**
 * "Buy casual clothes ($73, 6 weeks)" -> { text: "Buy casual clothes",
 * money: "$73", note: "6 weeks" }. A parenthetical with no money in it stays
 * whole as the note ("Ask for a raise (Cook: $5 -> $6)").
 */
export function splitLabel(label: string): SplitLabel {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(label);
  if (!m) return { text: label.trim(), money: '', note: '' };
  const parts = m[2]!.split(',').map((s) => s.trim());
  const i = parts.findIndex((p) => MONEY.test(p));
  if (i < 0) return { text: m[1]!.trim(), money: '', note: m[2]!.trim() };
  const money = parts[i]!;
  const rest = parts.filter((_, j) => j !== i).join(', ');
  return { text: m[1]!.trim(), money, note: rest };
}

export interface WindowRow {
  key: string;
  /** null for a group heading, which opens that group instead of acting. */
  action: Action | null;
  /** Set on a group heading: the group it opens. */
  group?: string;
  /** Left-hand text of the row. */
  text: string;
  /** Right-hand price, "" when the action costs nothing. */
  price: string;
  /** Hours charged, "" when free. */
  hours: string;
  /** Small parenthetical note kept from the label. */
  note: string;
  enabled: boolean;
  reason?: string;
}

export interface WindowButton {
  key: string;
  /** null for DONE, which closes the window rather than acting. */
  action: Action | null;
  label: string;
  enabled: boolean;
  reason?: string;
}

export interface LocationWindowModel {
  locationId: string;
  title: string;
  portrait: string;
  greeting: string;
  rows: WindowRow[];
  buttons: WindowButton[];
}

function keyOf(a: Action): string {
  return JSON.stringify(a);
}

function priceOf(o: ActionOption, split: SplitLabel): string {
  if (split.money) return split.money;
  return o.cost > 0 ? `$${Math.round(o.cost)}` : '';
}

function hoursOf(minutes: number): string {
  if (minutes <= 0) return '';
  return `${Math.max(1, Math.round(minutes / 60))}h`;
}

/** One menu row from one action option. */
export function toRow(o: ActionOption): WindowRow {
  const split = splitLabel(o.label);
  const row: WindowRow = {
    key: keyOf(o.action),
    action: o.action,
    text: split.text,
    price: priceOf(o, split),
    hours: hoursOf(o.minutes),
    note: split.note,
    enabled: o.enabled,
  };
  if (o.reason) row.reason = o.reason;
  return row;
}

/** Sort rows so the affordable ones come first but the order is otherwise stable. */
function byEnabled(rows: WindowRow[]): WindowRow[] {
  return [...rows.filter((r) => r.enabled), ...rows.filter((r) => !r.enabled)];
}

export interface WindowOptions {
  /** How many times this window has been opened, for greeting rotation. */
  visit?: number;
  /** The group the player has drilled into (e.g. an employer at the Employment Office). */
  group?: string | null;
  /** Put the disabled rows after the enabled ones (default true). */
  sort?: boolean;
  /**
   * What the clerk says instead of the greeting: the outcome of the last
   * action taken in this window ("Hired as Cook at $6/h.", "Refused: no
   * openings."), so a result is seen the moment it happens.
   */
  say?: string;
}

/**
 * The whole window for the location the player is standing at. Returns null at
 * a junction or a building the classic ruleset does not open — those never open
 * a window (PLAN §2).
 */
export function buildLocationWindow(
  state: GameState,
  playerId: string,
  locationId: string,
  opts: WindowOptions = {},
): LocationWindowModel {
  const options = availableActions(state, playerId).filter((o) => !HIDDEN.has(o.action.type) && !o.hidden);

  const buttons: WindowButton[] = [];
  for (const spec of BUTTON_ACTIONS) {
    const o = options.find((x) => x.action.type === spec.type);
    if (!o) continue;
    const b: WindowButton = { key: spec.type, action: o.action, label: spec.label, enabled: o.enabled };
    if (o.reason) b.reason = o.reason;
    buttons.push(b);
  }
  const buttonTypes = new Set(BUTTON_ACTIONS.map((b) => b.type));
  const listed = options.filter((o) => !buttonTypes.has(o.action.type));
  const groups = groupsOf(listed);
  const inGroup = opts.group && groups.includes(opts.group) ? opts.group : null;

  let rows: WindowRow[];
  if (inGroup) {
    // Inside a group: its own options, and a BACK button to the headings.
    rows = listed.filter((o) => o.group === inGroup).map(toRow);
    buttons.unshift({ key: 'back', action: null, label: 'BACK', enabled: true });
  } else if (groups.length) {
    // The headings, as the original listed the workplaces, then any
    // ungrouped options after them.
    rows = [
      ...groups.map((g) => groupRow(g, listed.filter((o) => o.group === g))),
      ...listed.filter((o) => !o.group).map(toRow),
    ];
  } else {
    rows = listed.map(toRow);
  }
  buttons.push({ key: 'done', action: null, label: 'DONE', enabled: true });

  return {
    locationId,
    title: inGroup ? inGroup.toUpperCase() : locationName(locationId).toUpperCase(),
    portrait: portraitFor(locationId),
    greeting: opts.say || greetingFor(locationId, opts.visit ?? 0),
    rows: opts.sort === false || inGroup === null && groups.length ? rows : byEnabled(rows),
    buttons,
  };
}

/** The distinct group headings among these options, in first-seen order. */
export function groupsOf(options: readonly ActionOption[]): string[] {
  const seen: string[] = [];
  for (const o of options) if (o.group && !seen.includes(o.group)) seen.push(o.group);
  return seen;
}

/** A heading row: opens the group; its note says how many options wait inside. */
function groupRow(group: string, members: readonly ActionOption[]): WindowRow {
  const n = members.length;
  return {
    key: `group:${group}`,
    action: null,
    group,
    text: group,
    price: '',
    hours: '',
    note: `${n} ${n === 1 ? 'job' : 'jobs'}`,
    enabled: true,
  };
}

/** The window model as the painter wants it (`layout.ts`'s `PanelModel`). */
export function locationPanel(w: LocationWindowModel): PanelModel {
  return {
    title: w.title,
    portrait: w.portrait,
    bubble: w.greeting,
    rows: w.rows.map((r) => ({
      key: r.key,
      text: r.text,
      value: r.price,
      hours: r.hours,
      note: r.note,
      enabled: r.enabled,
      ...(r.reason ? { reason: r.reason } : {}),
    })),
    buttons: w.buttons.map((b) => ({
      key: b.key,
      label: b.label,
      enabled: b.enabled,
      ...(b.reason ? { reason: b.reason } : {}),
    })),
  };
}

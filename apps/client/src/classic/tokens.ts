/**
 * Numbered player tokens. Seats 1..4 map to `UI.token_1..token_4` and to the
 * four ring colours the art package picked (`TOKEN_COLORS`, palette indices).
 *
 * Tokens reach the map through the figure MARKER convention documented in
 * `src/map/figures.ts`, so `api.ts` (THE CONTRACT) is untouched.
 */
import { PALETTE, TOKEN_COLORS } from '@jones2/pixelart';
import { CLOSED_LABEL, tokenLabel } from '../map/figures';

export { CLOSED_LABEL, tokenLabel };

/** Seats the classic ruleset supports. */
export const MAX_PLAYERS = 4;

/** 1-based token number for a seat index, wrapped so a 5th seat reuses token 1. */
export function tokenNumber(seat: number): number {
  return (((seat % MAX_PLAYERS) + MAX_PLAYERS) % MAX_PLAYERS) + 1;
}

export function tokenSpriteKey(seat: number): string {
  return `token_${tokenNumber(seat)}`;
}

function hex(index: number): string {
  const rgb = PALETTE.colors[index] ?? [136, 136, 136];
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The token's ring colour as CSS hex, for swatches in the DOM chrome. */
export function tokenColor(seat: number): string {
  return hex(TOKEN_COLORS[tokenNumber(seat) - 1] ?? TOKEN_COLORS[0]!);
}

/** Seat index for a player id, from the sim's turn order. */
export function seatOf(playerOrder: readonly string[], id: string): number {
  const i = playerOrder.indexOf(id);
  return i < 0 ? 0 : i;
}

/** Every seat's token number and colour, keyed by player id. */
export function assignTokens(playerOrder: readonly string[]): Record<string, { seat: number; token: number; color: string }> {
  const out: Record<string, { seat: number; token: number; color: string }> = {};
  playerOrder.forEach((id, seat) => {
    out[id] = { seat, token: tokenNumber(seat), color: tokenColor(seat) };
  });
  return out;
}

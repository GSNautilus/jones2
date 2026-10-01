/**
 * Two-tap travel (PLAN §7). A finger has no hover, so the first tap on a
 * building does what hovering does (route, clock wedge, the tooltip) and only
 * a second tap on the same building travels. Taps that cost nothing act at
 * once: your own location opens, a closed building shows its CLOSED board.
 * Pure, so the rules are tested without a map.
 */

/** What a tapped map spot is, from the current player's point of view. */
export type TapTarget =
  | 'none' // open ground, a junction, or a place with no window
  | 'here' // where the player stands
  | 'closed' // a building outside this game
  | 'arrival' // arrivals only
  | 'travel'; // somewhere the player could go (enabled or not)

/** `select` previews, `act` does what a mouse click does, `clear` drops the selection. */
export type TapResult = 'select' | 'act' | 'clear';

export function tapResult(target: TapTarget, alreadySelected: boolean, canGo: boolean): TapResult {
  switch (target) {
    case 'none':
      return 'clear';
    case 'here':
    case 'closed':
      return 'act';
    case 'arrival':
      return 'select';
    case 'travel':
      return alreadySelected && canGo ? 'act' : 'select';
  }
}

/** A pointer without hover: a finger, or a pen that may not report hover. */
export function isTouchPointer(pointerType: string | undefined): boolean {
  return pointerType === 'touch' || pointerType === 'pen';
}

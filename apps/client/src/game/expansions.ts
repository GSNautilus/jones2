/**
 * The new game screen's expansion picker, as pure functions. An expansion opens some of the Jones 2
 * map's closed buildings (sim: content/classic/expansions.ts); the Classic ring has none to open.
 */
import { classic } from '@jones2/sim';

/** The expansions a map can host, in the sim's order. */
export function expansionChoices(townId: string): classic.Expansion[] {
  return classic.expansionsFor(townId);
}

/** Tick or untick one expansion, keeping the sim's order. */
export function toggleExpansion(chosen: readonly string[], id: string): string[] {
  const next = new Set(chosen);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return classic.EXPANSION_LIST.map((x) => x.id).filter((x) => next.has(x));
}

/**
 * What goes in `GameConfig.expansions`: the ticked ones this map can host, or undefined for none
 * (choices are remembered across a map switch, but only the map's own apply).
 */
export function configExpansions(townId: string, chosen: readonly string[]): string[] | undefined {
  const allowed = new Set(expansionChoices(townId).map((x) => x.id));
  const list = chosen.filter((id) => allowed.has(id as classic.ExpansionId));
  return list.length ? list : undefined;
}

/** The line beside the Expansions button: "None" or the names. */
export function expansionSummary(townId: string, chosen: readonly string[]): string {
  const ids = configExpansions(townId, chosen) ?? [];
  if (!ids.length) return 'None';
  return ids.map((id) => classic.EXPANSIONS[id as classic.ExpansionId].name).join(', ');
}

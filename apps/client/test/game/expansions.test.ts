import { describe, expect, it } from 'vitest';
import { configExpansions, expansionChoices, expansionSummary, toggleExpansion } from '../../src/game/expansions';

describe('the new game screen expansion picker', () => {
  it('offers Wheels & Whiskers on the Jones 2 map only', () => {
    expect(expansionChoices('riverton').map((x) => x.name)).toEqual(['Wheels & Whiskers']);
    expect(expansionChoices('classic')).toEqual([]);
  });

  it('ticks and unticks', () => {
    const on = toggleExpansion([], 'wheels_whiskers');
    expect(on).toEqual(['wheels_whiskers']);
    expect(toggleExpansion(on, 'wheels_whiskers')).toEqual([]);
  });

  it('puts only the map\'s own expansions in the config, and nothing when none', () => {
    expect(configExpansions('riverton', ['wheels_whiskers'])).toEqual(['wheels_whiskers']);
    expect(configExpansions('riverton', [])).toBeUndefined();
    // Remembered across a switch to the ring, but not applied there.
    expect(configExpansions('classic', ['wheels_whiskers'])).toBeUndefined();
  });

  it('summarises the choice beside the button', () => {
    expect(expansionSummary('riverton', [])).toBe('None');
    expect(expansionSummary('riverton', ['wheels_whiskers'])).toBe('Wheels & Whiskers');
  });
});

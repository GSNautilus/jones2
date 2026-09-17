import { describe, expect, it } from 'vitest';
import { riverton, type Town } from '@jones2/town';
import {
  CLASSIC_LOCATION_IDS,
  closedNodes,
  greetingFor,
  isArrivalLocation,
  isClassicLocation,
  isClosedLocation,
  locationName,
} from '../../src/classic/locations';

const TOWN = riverton as Town;

describe('the classic set of buildings', () => {
  it('is the 13 locations the ruleset opens', () => {
    expect(CLASSIC_LOCATION_IDS).toHaveLength(13);
    for (const id of [
      'employment',
      'monolith',
      'zmart',
      'qt_clothing',
      'socket_city',
      'blacks_market',
      'university',
      'bank',
      'factory',
      'pawn',
      'rent_office',
      'lowcost',
      'security_apts',
    ]) {
      expect(isClassicLocation(id)).toBe(true);
      expect(isClosedLocation(id)).toBe(false);
    }
  });

  it('shuts every other building on the map', () => {
    for (const id of ['stadium', 'corpo', 'theme_park', 'cinema', 'gym', 'clinic', 'lookout']) {
      expect(isClosedLocation(id)).toBe(true);
    }
    expect(isClassicLocation(null)).toBe(false);
    expect(isClosedLocation(undefined)).toBe(false);
  });

  it('treats the bus depot as the arrival point: neither classic nor closed', () => {
    expect(isArrivalLocation('bus_depot')).toBe(true);
    expect(isClassicLocation('bus_depot')).toBe(false);
    expect(isClosedLocation('bus_depot')).toBe(false);
  });

  it('finds 21 closed buildings on Riverton, and none of them classic', () => {
    const closed = closedNodes(TOWN);
    const located = TOWN.nodes.filter((n) => n.location);
    expect(located).toHaveLength(35);
    expect(closed).toHaveLength(35 - 13 - 1);
    for (const c of closed) expect(isClassicLocation(c.location)).toBe(false);
  });
});

describe('greetings', () => {
  it('rotates through the clerk quotes', () => {
    const a = greetingFor('monolith', 0);
    const b = greetingFor('monolith', 1);
    expect(a).not.toBe('');
    expect(b).not.toBe(a);
    expect(greetingFor('monolith', 0)).toBe(a);
  });

  it('wraps round and copes with a negative visit count', () => {
    const n = 3;
    expect(greetingFor('pawn', n)).toBe(greetingFor('pawn', n + 8));
    expect(greetingFor('pawn', -1)).not.toBe('');
  });

  it('gives the two apartments a line of their own', () => {
    expect(greetingFor('lowcost', 0)).toMatch(/home/i);
    expect(greetingFor('security_apts', 2)).toMatch(/home/i);
  });
});

describe('names', () => {
  it('uses the classic table where there is one', () => {
    expect(locationName('monolith')).toBe('Monolith Burgers');
    expect(locationName('stadium')).toBe('STADIUM');
  });
});

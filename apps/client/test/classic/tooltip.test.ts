import { describe, expect, it } from 'vitest';
import { hoursLeft, hoursOf, travelTooltip } from '../../src/classic/tooltip';

describe('travelTooltip', () => {
  it('names the place and the trip in whole hours', () => {
    expect(travelTooltip({ name: 'Bank', hours: 2, hoursLeft: 40, enabled: true })).toBe('Bank · 2h');
  });

  it('says why a trip does not fit', () => {
    expect(
      travelTooltip({ name: 'Hi-Tech U', hours: 3, hoursLeft: 2, enabled: false, reason: 'Not enough time' }),
    ).toBe('Hi-Tech U · Not enough time: 3h, 2h left');
  });

  it('treats a missing reason as not enough time', () => {
    expect(travelTooltip({ name: 'Z-Mart', hours: 1, hoursLeft: 0, enabled: false })).toBe(
      'Z-Mart · Not enough time: 1h, 0h left',
    );
  });

  it('passes any other reason through', () => {
    expect(travelTooltip({ name: 'Factory', hours: 1, hoursLeft: 9, enabled: false, reason: 'Week is over' })).toBe(
      'Factory · Week is over',
    );
  });

  it('marks shut buildings and the one you are standing in', () => {
    expect(travelTooltip({ name: 'Stadium', hours: 0, hoursLeft: 9, enabled: false, closed: true })).toBe(
      'Stadium · Closed',
    );
    expect(travelTooltip({ name: 'Pawn Shop', hours: 0, hoursLeft: 9, enabled: false, here: true })).toBe(
      'Pawn Shop · You are here',
    );
  });
});

describe('hour conversions', () => {
  it('rounds the week down and an action up', () => {
    expect(hoursLeft(3600)).toBe(60);
    expect(hoursLeft(119)).toBe(1);
    expect(hoursLeft(-5)).toBe(0);
    expect(hoursOf(0)).toBe(0);
    expect(hoursOf(60)).toBe(1);
    expect(hoursOf(180)).toBe(3);
    expect(hoursOf(20)).toBe(1);
  });
});

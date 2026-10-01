import { describe, expect, it } from 'vitest';
import { isTouchPointer, tapResult } from '../../src/classic/touch';

describe('two-tap travel', () => {
  it('previews a destination on the first tap', () => {
    expect(tapResult('travel', false, true)).toBe('select');
  });

  it('goes on the second tap of the same destination', () => {
    expect(tapResult('travel', true, true)).toBe('act');
  });

  it('never goes somewhere the player cannot reach, however often it is tapped', () => {
    expect(tapResult('travel', true, false)).toBe('select');
  });

  it('acts at once where nothing is spent: your own location, a closed building', () => {
    expect(tapResult('here', false, false)).toBe('act');
    expect(tapResult('closed', false, false)).toBe('act');
  });

  it('only explains an arrivals-only spot', () => {
    expect(tapResult('arrival', true, false)).toBe('select');
  });

  it('clears the selection on open ground', () => {
    expect(tapResult('none', true, false)).toBe('clear');
  });

  it('treats a finger and a pen as touch, a mouse not', () => {
    expect(isTouchPointer('touch')).toBe(true);
    expect(isTouchPointer('pen')).toBe(true);
    expect(isTouchPointer('mouse')).toBe(false);
    expect(isTouchPointer(undefined)).toBe(false);
  });
});

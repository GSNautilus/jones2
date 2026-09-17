import { describe, expect, it } from 'vitest';
import type { PlayerEvent } from '@jones2/sim';
import { sfxForEvent } from '../../src/audio/events';

function ev(action: PlayerEvent['action'], text = ''): PlayerEvent {
  return { minute: 0, duration: 0, action, node: 'employment', deltas: [], text } as PlayerEvent;
}

describe('sfxForEvent', () => {
  it('rings the till for work and money moving', () => {
    expect(sfxForEvent(ev({ type: 'work' }, 'Worked 6h as Cook'))).toBe('cash');
    expect(sfxForEvent(ev({ type: 'payRent' } as PlayerEvent['action'], 'Paid rent'))).toBe('cash');
  });

  it('tells a hire from a refusal by the outcome text', () => {
    expect(sfxForEvent(ev({ type: 'apply', jobId: 'monolith_cook' }, 'Hired as Cook at $5/h.'))).toBe('hired');
    expect(sfxForEvent(ev({ type: 'apply', jobId: 'monolith_cook' }, 'Refused Cook: no openings.'))).toBe('refused');
  });

  it('treats every purchase as a buy and graduation as its own moment', () => {
    expect(sfxForEvent(ev({ type: 'buyFood', foodId: 'hamburgers' } as PlayerEvent['action'], 'Bought hamburgers'))).toBe('buy');
    expect(sfxForEvent(ev({ type: 'class', degreeId: 'junior_college' } as PlayerEvent['action'], 'Studied Junior College (3/10).'))).toBe('study');
    expect(sfxForEvent(ev({ type: 'class', degreeId: 'junior_college' } as PlayerEvent['action'], 'Graduated: Junior College!'))).toBe('graduate');
  });

  it('leaves travel and relaxing silent here', () => {
    expect(sfxForEvent(ev({ type: 'travel', to: 'bank' }, 'Travelled'))).toBeNull();
    expect(sfxForEvent(ev({ type: 'relax', minutes: 360 }, 'Relaxed'))).toBeNull();
  });
});

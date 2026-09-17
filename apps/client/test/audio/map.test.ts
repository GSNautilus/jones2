import { describe, expect, it } from 'vitest';
import { fileFor, resolveMap } from '../../src/audio/map';
import { fadeGain, pickNext } from '../../src/audio/player';

describe('resolveMap', () => {
  it('sorts named sounds into music and moments by keyword', () => {
    const map = resolveMap({
      '6': 'main theme music',
      '100': 'random music 2',
      '23': 'cash register',
      '27': 'hired!',
      '28': 'refused / no openings',
      '31': 'bought something',
      '44': 'door chime',
      '45': 'weekend jingle',
      '42': 'something odd',
    });
    expect(map.music).toEqual([6, 100]);
    expect(map.sfx.cash).toEqual([23]);
    expect(map.sfx.hired).toEqual([27]);
    expect(map.sfx.refused).toEqual([28]);
    expect(map.sfx.buy).toEqual([31]);
    expect(map.sfx.door).toEqual([44]);
    expect(map.sfx.weekend).toEqual([45]);
    expect(map.unmatched).toEqual([{ number: 42, name: 'something odd' }]);
  });

  it('lets overrides pin a moment and the rotation explicitly', () => {
    const map = resolveMap({ '23': 'cash register', '6': 'theme', overrides: { cash: [30, 31], music: 100 } });
    expect(map.sfx.cash).toEqual([30, 31]);
    expect(map.music).toEqual([100]);
  });

  it('ignores blanks and non-numeric keys', () => {
    const map = resolveMap({ _comment: 'x', '9': '   ', '10': 'theme' } as never);
    expect(map.music).toEqual([10]);
    expect(map.unmatched).toEqual([]);
  });

  it('names the file by zero-padded resource number', () => {
    expect(fileFor(6)).toBe('audio/ogg/sound_006.ogg');
  });
});

describe('music rotation', () => {
  it('never plays the same piece twice in a row when there is a choice', () => {
    const seq = [0.1, 0.9, 0.5, 0.99, 0.0];
    let i = 0;
    const random = () => seq[i++ % seq.length]!;
    let last: number | null = null;
    for (let k = 0; k < 20; k++) {
      const n = pickNext([6, 100, 38], last, random);
      expect(n).not.toBe(last);
      last = n;
    }
  });

  it('repeats a lone piece and returns null for none', () => {
    expect(pickNext([6], 6, () => 0.3)).toBe(6);
    expect(pickNext([], null, () => 0.3)).toBeNull();
  });

  it('fades linearly in and out over the fade time', () => {
    expect(fadeGain(0, 2, false)).toBe(0);
    expect(fadeGain(1, 2, false)).toBe(0.5);
    expect(fadeGain(5, 2, false)).toBe(1);
    expect(fadeGain(0, 2, true)).toBe(1);
    expect(fadeGain(2, 2, true)).toBe(0);
  });
});

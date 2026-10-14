import { describe, expect, it } from 'vitest';
import { createGame, CLASSIC_DEFAULT_GOALS } from '@jones2/sim';
import { statsModel } from '../../src/classic/screens';

function game() {
  return createGame({
    ruleset: 'classic',
    mode: 'classic',
    goals: { ...CLASSIC_DEFAULT_GOALS },
    seed: 11,
    townId: 'riverton',
    players: [{ id: 'p0', name: 'Ann' }],
  });
}

const row = (s: ReturnType<typeof game>, key: string) => statsModel(s, s.players.p0!).rows.find((r) => r.key === key);

describe('statsModel', () => {
  it('names the employer under the job', () => {
    const s = game();
    expect(row(s, 'employer')?.value).toBe('-');
    s.players.p0!.classic!.jobId = 'zmart_clerk';
    expect(row(s, 'job')?.value).toBe('Clerk');
    expect(row(s, 'employer')?.value).toBe('Z-Mart');
  });
});

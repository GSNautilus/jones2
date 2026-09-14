/**
 * Seeded PRNG (mulberry32). The state is a plain number stored in GameState so
 * the whole game is reproducible from its seed and event logs.
 */
export type RngState = number;

export function seedRng(seed: number): RngState {
  return (seed >>> 0) || 0x9e3779b9;
}

/** Returns [next state, float in [0,1)]. */
export function nextFloat(s: RngState): [RngState, number] {
  let t = (s + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return [t, ((r ^ (r >>> 14)) >>> 0) / 4294967296];
}

/** Integer in [min, max] inclusive. */
export function nextInt(s: RngState, min: number, max: number): [RngState, number] {
  const [ns, f] = nextFloat(s);
  return [ns, min + Math.floor(f * (max - min + 1))];
}

export function pick<T>(s: RngState, arr: readonly T[]): [RngState, T] {
  const [ns, i] = nextInt(s, 0, arr.length - 1);
  return [ns, arr[i]!];
}

export function chance(s: RngState, p: number): [RngState, boolean] {
  const [ns, f] = nextFloat(s);
  return [ns, f < p];
}

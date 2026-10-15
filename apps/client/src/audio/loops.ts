/**
 * The pieces that loop in the original, and where. A Sierra sound marks its
 * loop point with a program change 127 on the control channel (15); the
 * game's script decides whether to loop at all. Read from the CD edition's
 * sound resources (tools/sci) and kept only for the moments the original
 * holds on a screen. The background rotation's marked pieces (25, 36, 38, 40)
 * are left out on purpose: the rotation plays each piece once.
 *
 * Times are in seconds of the rendered OGG, which runs at the SCI tick rate
 * (60 a second) from tick 0. `end` is the song's last tick, not the file's
 * end: the render carries about 1.5 s of reverb tail that a loop must skip.
 */
export interface MusicLoop {
  /** Where each repeat starts. */
  start: number;
  /** Where each pass ends and jumps back to `start`. */
  end: number;
}

const TICKS = 60;

export const MUSIC_LOOPS: Readonly<Record<number, MusicLoop>> = {
  /** Start of turn music: the whole piece, for as long as the week's cards are up. */
  9: { start: 0, end: 955 / TICKS },
  /** New game screen: a 9.6 s intro, then the rest repeats. */
  10: { start: 575 / TICKS, end: 2016 / TICKS },
};

export function loopFor(n: number): MusicLoop | null {
  return MUSIC_LOOPS[n] ?? null;
}

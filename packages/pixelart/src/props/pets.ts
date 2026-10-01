/**
 * Pets that follow a player around the map (the Wheels & Whiskers expansion). Side views facing
 * east, mirrored for west, two frames each (legs, fins or wings), with an ink outline so they
 * read on grass and road alike. The fish and the flyers hover: the renderer lifts them and puts a
 * shadow under them (`PET_MOTION`).
 */
import { C } from '../palette';
import type { Sprite } from '../types';
import { createSprite, spriteFromRows } from '../surface';

export type PetId = 'goldfish' | 'cat' | 'dog' | 'clownfish' | 'owl' | 'dragon';
export const PET_IDS: readonly PetId[] = ['goldfish', 'cat', 'dog', 'clownfish', 'owl', 'dragon'];

/** How a pet moves: on the ground, swimming through the air (yes), or flying. */
export const PET_MOTION: Record<PetId, 'ground' | 'swim' | 'fly'> = {
  goldfish: 'swim',
  cat: 'ground',
  dog: 'ground',
  clownfish: 'swim',
  owl: 'fly',
  dragon: 'fly',
};

const L: Record<string, number> = {
  o: C.orange!, O: C.orangeDark!, w: C.white!, e: C.ink!, k: C.slate!, K: C.slateDark!,
  b: C.wood!, B: C.woodDark!, n: C.ink!, y: C.yellow!, c: C.cream!, g: C.green!, G: C.greenDark!,
  p: C.pink!, r: C.red!,
};

// East-facing, frame 0 then frame 1.
const ART: Record<PetId, [string[], string[]]> = {
  goldfish: [
    ['...oo..', 'O.oooo.', 'OOooeoo', 'O.oooo.', '...oo..'],
    ['...oo..', '..oooo.', 'OOooeoo', '..oooo.', '...oo..'],
  ],
  clownfish: [
    ['...woow.', 'O.owoowo', 'OOowoewo', 'O.owoowo', '...woow.'],
    ['...woow.', '..owoowo', 'OOowoewo', '..owoowo', '...woow.'],
  ],
  cat: [
    ['.......k.k', 'K......kkk', 'K.kkkkkkek', '.Kkkkkkkkp', '..kkkkkk..', '..k.k.k.k.'],
    ['.......k.k', 'K......kkk', 'K.kkkkkkek', '.Kkkkkkkkp', '..kkkkkk..', '.k..k..k.k'],
  ],
  dog: [
    ['.......bb..', 'b.....bbebn', '.b...Bbbbb.', '..bbbbbbb..', '..bbbbbbb..', '..b.b..b.b.', '..b.b..b.b.'],
    ['.......bb..', '.b....bbebn', '..b..Bbbbb.', '..bbbbbbb..', '..bbbbbbb..', '.b..b..b..b', '.b..b..b..b'],
  ],
  owl: [
    ['.B.....B.', '.BbbbbbB.', '.beywyeb.', '.bbbobbb.', '.BcccccB.', '.BcccccB.', '..bcccb..', '...y.y...'],
    ['.B.....B.', '.BbbbbbB.', 'BbeywyebB', 'BbbbobbbB', '.BcccccB.', '..cccccc.', '..bcccb..', '...y.y...'],
  ],
  dragon: [
    ['....GG........', '...GggG.......', '..GgggG....gg.', '...GggG...gggn', 'r..ggggggggggg', '.rgggggggggg..', '...ggyyygg....', '...g.g..g.g...'],
    ['..............', '..............', '...........gg.', '..........gggn', 'r..ggggggggggg', '.rgggggggggg..', '..GggyyyggG...', '.GGgg.g..ggGG.'],
  ],
};

/** A copy of `s` one pixel bigger all round, with an ink outline round its pixels. */
export function outlined(s: Sprite): Sprite {
  const o = createSprite(s.width + 2, s.height + 2, s.anchorX + 1, s.anchorY + 1, s.footprintW, s.footprintH);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < s.width && y < s.height ? s.pixels[y * s.width + x]! : 0);
  for (let y = -1; y <= s.height; y++) {
    for (let x = -1; x <= s.width; x++) {
      const v = at(x, y);
      const i = (y + 1) * o.width + (x + 1);
      if (v) o.pixels[i] = v;
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) o.pixels[i] = C.ink!;
    }
  }
  return o;
}

const cache = new Map<string, Sprite>();

/** A pet facing `dir` ('e' or 'w'), frame 0 or 1, anchored at its bottom centre. */
export function petSprite(id: PetId, dir: 'e' | 'w', frame: number): Sprite {
  const f = ((frame % 2) + 2) % 2;
  const key = `${id}|${dir}|${f}`;
  let s = cache.get(key);
  if (!s) {
    const rows = ART[id][f]!;
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    const padded = rows.map((r) => r.padEnd(width, '.'));
    const facing = dir === 'e' ? padded : padded.map((r) => [...r].reverse().join(''));
    s = outlined(spriteFromRows(facing, L));
    cache.set(key, s);
  }
  return s;
}

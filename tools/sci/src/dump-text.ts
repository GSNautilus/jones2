/** Dump every text resource of a game directory as JSON: { "209": ["..."], ... }. */
import { readFileSync, writeFileSync } from 'node:fs';
import { GameFiles } from './resources';

const dir = process.argv[2]!;
const out = process.argv[3]!;
const g = new GameFiles(dir);
function strings(bytes: Uint8Array): string[] {
  const res: string[] = [];
  let cur: number[] = [];
  for (const b of bytes) {
    if (b === 0) { res.push(Buffer.from(cur).toString('latin1')); cur = []; } else cur.push(b);
  }
  if (cur.length) res.push(Buffer.from(cur).toString('latin1'));
  return res;
}
const texts: Record<string, string[]> = {};
for (const e of g.ofType(3).sort((a, b) => a.number - b.number)) {
  try { texts[String(e.number)] = strings(g.unpack(e)); } catch (err) { texts[String(e.number)] = [`ERROR ${(err as Error).message}`]; }
}
writeFileSync(out, JSON.stringify(texts, null, 1));
console.log('wrote', out, Object.keys(texts).length, 'text resources');
void readFileSync;

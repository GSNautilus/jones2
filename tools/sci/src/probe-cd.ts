/**
 * Probe the CD edition: which text resources exist and how many lines each
 * holds, against the numbering of the spoken lines, to find how lines and
 * speech are matched up.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameFiles } from './resources';
import { readAudioMap } from './voices';

const dir = process.argv[2]!;
const g = new GameFiles(dir);
const TEXT = 3;

function strings(bytes: Uint8Array): string[] {
  const out: string[] = [];
  let cur: number[] = [];
  for (const b of bytes) {
    if (b === 0) {
      out.push(Buffer.from(cur).toString('latin1'));
      cur = [];
    } else cur.push(b);
  }
  if (cur.length) out.push(Buffer.from(cur).toString('latin1'));
  return out;
}

const texts = g.ofType(TEXT).sort((a, b) => a.number - b.number);
let totalLines = 0;
for (const e of texts) {
  const h = g.header(e);
  let lines: string[] = [];
  try {
    lines = strings(g.unpack(e));
  } catch (err) {
    console.log(`text ${e.number}: ${(err as Error).message} (method ${h.method})`);
    continue;
  }
  totalLines += lines.length;
  console.log(`text ${String(e.number).padStart(3)}  ${String(lines.length).padStart(3)} lines  m${h.method}  | ${lines.slice(0, 2).map((s) => s.slice(0, 50).replace(/\s+/g, ' ')).join(' | ')}`);
}
console.log('total text lines', totalLines);

const audio = readAudioMap(new Uint8Array(readFileSync(join(dir, 'audio001.map'))));
const nums = audio.map((a) => a.number);
const runs: string[] = [];
let start = nums[0]!;
let prev = nums[0]!;
for (const n of nums.slice(1)) {
  if (n !== prev + 1) {
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
  }
  prev = n;
}
runs.push(start === prev ? `${start}` : `${start}-${prev}`);
console.log('audio number runs:', runs.join(', '));
console.log('flag 0x21 lines:', audio.filter((a) => a.flag === 0x21).map((a) => a.number).join(','));

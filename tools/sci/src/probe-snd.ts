/** Probe: the CD edition's external .snd files — which device tracks do they carry? */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEVICE_NAMES, readTracks, parseSound } from './sound';
import { summarise } from './midi';
const dir = process.argv[2]!;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.snd')).sort()) {
  const raw = new Uint8Array(readFileSync(join(dir, f)));
  // patch files start with the resource type byte (0x80 | type) and a header-size byte
  const body = raw.subarray(2);
  const tracks = readTracks(body);
  const gm = parseSound(body, [0x07]);
  const s = gm ? summarise(gm) : null;
  console.log(`${f}  ${raw.length} B  devices ${tracks.map((t) => `${DEVICE_NAMES[t.device] ?? t.device}(${t.channels.length})`).join(' ')}  gm: ${s ? `${s.notes} notes ${s.seconds}s programs ${s.programs.join(',')}` : 'none'}`);
}

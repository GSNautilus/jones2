/** Probe: dump the parsed MT-32 events of given sound numbers. */
import { GameFiles, SOUND } from './resources';
import { parseSound } from './sound';
const [dir, ...nums] = process.argv.slice(2);
const g = new GameFiles(dir!);
for (const e of g.ofType(SOUND)) {
  if (!nums.includes(String(e.number))) continue;
  const s = parseSound(g.unpack(e), [0x0c])!;
  console.log(`sound ${e.number} device ${s.device} ticks ${s.ticks}`);
  for (const ch of s.channels) {
    console.log(` channel ${ch.midiChannel} flags ${ch.flags} poly ${ch.poly} events ${ch.events.length}`);
    for (const ev of ch.events.slice(0, 14)) console.log(`   t${String(ev.tick).padStart(5)} ${ev.status.toString(16)} ${ev.data.join(' ')}`);
  }
}

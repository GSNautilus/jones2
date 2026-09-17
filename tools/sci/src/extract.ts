/**
 * Extract every sound resource from an SCI game directory as a standard MIDI
 * file, plus a manifest describing each one.
 *
 *   npx tsx tools/sci/src/extract.ts "<game dir>" art/audio/midi [device]
 *
 * `device` picks the track: mt32 (default), adlib, gm, pcspeaker, tandy, cms.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarise, toStandardMidi } from './midi';
import { GameFiles, SOUND } from './resources';
import { DEVICE_NAMES, parseSound, readTracks } from './sound';

const [dir, outDir, deviceName = 'mt32'] = process.argv.slice(2);
if (!dir || !outDir) {
  console.error('usage: extract.ts <game dir> <out dir> [device]');
  process.exit(2);
}
const deviceId = Number(Object.entries(DEVICE_NAMES).find(([, n]) => n === deviceName)?.[0]);
if (Number.isNaN(deviceId)) {
  console.error(`unknown device ${deviceName}; one of ${Object.values(DEVICE_NAMES).join(', ')}`);
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const game = new GameFiles(dir);
const manifest: Record<string, unknown>[] = [];
for (const e of game.ofType(SOUND)) {
  const bytes = game.unpack(e);
  const tracks = readTracks(bytes);
  const sound = parseSound(bytes, [deviceId, 0x0c, 0x07, 0x00]);
  if (!sound) {
    console.log(`sound ${e.number}: no tracks`);
    continue;
  }
  const midi = toStandardMidi(sound);
  const file = `sound_${String(e.number).padStart(3, '0')}.mid`;
  writeFileSync(join(outDir, file), midi);
  const s = summarise(sound);
  manifest.push({
    number: e.number,
    file,
    bytes: bytes.length,
    devices: tracks.map((t) => DEVICE_NAMES[t.device] ?? `0x${t.device.toString(16)}`),
    device: DEVICE_NAMES[sound.device] ?? sound.device,
    channels: sound.channels.map((c) => c.midiChannel),
    ...s,
  });
  console.log(`${file}  ${String(s.seconds).padStart(6)}s  ${String(s.notes).padStart(5)} notes  ch ${sound.channels.map((c) => c.midiChannel).join(',')}  programs ${s.programs.join(',')}`);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${manifest.length} sounds -> ${outDir}`);

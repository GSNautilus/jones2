/**
 * Extract every sound resource from an SCI game directory as a standard MIDI
 * file, plus a manifest describing each one.
 *
 *   npx tsx tools/sci/src/extract.ts "<game dir>" assets/sierra/source/midi [device]
 *
 * `device` picks the track: mt32 (default), adlib, gm, pcspeaker, tandy, cms.
 *
 * The directory may hold the sounds either inside RESOURCE.MAP/RESOURCE.00N
 * (the floppy release) or as external `NNNN.snd` patch files (the CD
 * release, numbered 1000 + the sound number, with a 2-byte patch header and
 * a General MIDI track). Both are read; when a manifest already exists in the
 * output directory, entries are merged by number so the two releases can be
 * layered: run the floppy first, then the CD with `gm`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

interface Found {
  number: number;
  bytes: Uint8Array;
  source: string;
}

/**
 * Every sound in the directory. A patch file overrides the resource of the
 * same number inside the volumes, as it does in the interpreter (the CD's
 * patch files are the General MIDI upgrades of the volume's MT-32 sounds).
 */
function loadSounds(gameDir: string): Found[] {
  const out: Found[] = [];
  for (const f of readdirSync(gameDir)) {
    const m = /^(\d+)\.snd$/i.exec(f);
    if (!m) continue;
    const raw = new Uint8Array(readFileSync(join(gameDir, f)));
    if (raw.length < 2 || (raw[0]! & 0x7f) !== SOUND) continue;
    const n = Number(m[1]);
    out.push({ number: n >= 1000 ? n - 1000 : n, bytes: raw.subarray(2), source: f });
  }
  if (existsSync(join(gameDir, 'RESOURCE.MAP'))) {
    const game = new GameFiles(gameDir);
    for (const e of game.ofType(SOUND)) {
      if (out.some((s) => s.number === e.number)) continue;
      out.push({ number: e.number, bytes: game.unpack(e), source: 'volume' });
    }
  }
  return out.sort((a, b) => a.number - b.number);
}

mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'manifest.json');
type Entry = Record<string, unknown> & { number: number };
const manifest: Entry[] = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Entry[]) : [];
let written = 0;
for (const { number, bytes, source } of loadSounds(dir)) {
  const tracks = readTracks(bytes);
  const sound = parseSound(bytes, [deviceId, 0x0c, 0x07, 0x00]);
  if (!sound) {
    console.log(`sound ${number}: no tracks`);
    continue;
  }
  // A General MIDI track needs no program mapping; the MT-32 one does.
  const midi = toStandardMidi(sound, { mapPrograms: sound.device !== 0x07 });
  const file = `sound_${String(number).padStart(3, '0')}.mid`;
  writeFileSync(join(outDir, file), midi);
  written++;
  const s = summarise(sound);
  const entry: Entry = {
    number,
    file,
    source,
    bytes: bytes.length,
    devices: tracks.map((t) => DEVICE_NAMES[t.device] ?? `0x${t.device.toString(16)}`),
    device: DEVICE_NAMES[sound.device] ?? sound.device,
    channels: sound.channels.map((c) => c.midiChannel),
    ...s,
  };
  const at = manifest.findIndex((m) => m.number === number);
  if (at >= 0) manifest[at] = entry;
  else manifest.push(entry);
  console.log(
    `${file}  ${String(s.seconds).padStart(6)}s  ${String(s.notes).padStart(5)} notes  ${String(entry.device).padEnd(9)} ch ${sound.channels.map((c) => c.midiChannel).join(',')}  programs ${s.programs.join(',')}`,
  );
}
manifest.sort((a, b) => a.number - b.number);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${written} sounds written, ${manifest.length} in ${manifestPath}`);

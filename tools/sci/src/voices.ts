/**
 * The CD-ROM edition's speech: `audio001.map` lists every spoken line as a
 * 10-byte entry (number u16, offset u32 whose top byte is a flag, size u32)
 * into `audio001.002`, which is raw 8-bit unsigned mono PCM. The map ends
 * with an 0xFFFF number. `cdaudio.map` is the same list in Redbook frames for
 * playing from the disc; the hard-disk copy is what we read.
 *
 *   npx tsx tools/sci/src/voices.ts "<cd dir>" art/audio/voice [rate]
 *
 * Writes voice/wav/line_NNN.wav (git-ignored), voice/ogg/line_NNN.ogg via
 * ffmpeg, and voice/manifest.json. The sample rate is not stored anywhere in
 * the files; Sierra's digitised speech of this era is 11025 Hz, which is the
 * default here.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface VoiceEntry {
  number: number;
  offset: number;
  flag: number;
  size: number;
}

export function readAudioMap(bytes: Uint8Array): VoiceEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: VoiceEntry[] = [];
  for (let i = 0; i + 10 <= bytes.length; i += 10) {
    const number = view.getUint16(i, true);
    if (number === 0xffff) break;
    const raw = view.getUint32(i + 2, true);
    out.push({ number, offset: raw & 0xffffff, flag: raw >>> 24, size: view.getUint32(i + 6, true) });
  }
  return out;
}

/** A WAV file around 8-bit unsigned mono samples. */
export function wav8(samples: Uint8Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length);
  const v = new DataView(out.buffer);
  const tag = (o: number, s: string) => {
    for (let i = 0; i < 4; i++) out[o + i] = s.charCodeAt(i);
  };
  tag(0, 'RIFF');
  v.setUint32(4, 36 + samples.length, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true); // byte rate: 1 byte per sample
  v.setUint16(32, 1, true); // block align
  v.setUint16(34, 8, true); // bits
  tag(36, 'data');
  v.setUint32(40, samples.length, true);
  out.set(samples, 44);
  return out;
}

if (process.argv[1] && /voices\.ts$/.test(process.argv[1])) {
  const [dir, outRoot, rateArg] = process.argv.slice(2);
  if (!dir || !outRoot) {
    console.error('usage: voices.ts <cd dir> <out root> [sample rate]');
    process.exit(2);
  }
  const rate = Number(rateArg ?? 11025);
  const map = readAudioMap(new Uint8Array(readFileSync(join(dir, 'audio001.map'))));
  const vol = new Uint8Array(readFileSync(join(dir, 'audio001.002')));
  const wavDir = join(outRoot, 'wav');
  const oggDir = join(outRoot, 'ogg');
  mkdirSync(wavDir, { recursive: true });
  mkdirSync(oggDir, { recursive: true });
  const manifest: Array<{ number: number; file: string; seconds: number; flag: number }> = [];
  for (const e of map) {
    const samples = vol.subarray(e.offset, e.offset + e.size);
    const base = `line_${String(e.number).padStart(3, '0')}`;
    const wavPath = join(wavDir, `${base}.wav`);
    writeFileSync(wavPath, wav8(samples, rate));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libvorbis', '-q:a', '3', join(oggDir, `${base}.ogg`)]);
    manifest.push({ number: e.number, file: `${base}.ogg`, seconds: Math.round((e.size / rate) * 10) / 10, flag: e.flag });
  }
  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const total = manifest.reduce((s, m) => s + m.seconds, 0);
  console.log(`${manifest.length} lines, ${Math.round(total / 60)} minutes, at ${rate} Hz -> ${outRoot}`);
}

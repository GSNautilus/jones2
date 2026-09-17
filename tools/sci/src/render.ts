/**
 * Render the extracted MIDI files to audio with a General MIDI soundfont, and
 * write an audition page so the sounds can be listened to and named.
 *
 *   npx tsx tools/sci/src/render.ts art/audio/midi art/audio [soundfont.sf2|sf3]
 *
 * Writes art/audio/wav/*.wav (ignored by git), art/audio/ogg/*.ogg (ffmpeg,
 * libvorbis) and art/audio/index.html. The soundfont defaults to the
 * MuseScore General font in tools/sci/soundfont/.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BasicMIDI, SoundBankLoader, SpessaSynthProcessor, SpessaSynthSequencer, audioToWav } from 'spessasynth_core';

const [midiDir, outRoot, sfArg] = process.argv.slice(2);
if (!midiDir || !outRoot) {
  console.error('usage: render.ts <midi dir> <out root> [soundfont]');
  process.exit(2);
}
const sfPath = sfArg ?? resolve('tools/sci/soundfont/MuseScore_General.sf3');
if (!existsSync(sfPath)) {
  console.error(`soundfont not found: ${sfPath}`);
  process.exit(2);
}

const RATE = 44100;
/** Small on purpose: this is also the interval between modulator and LFO updates. */
const BUF = 256;
const TAIL_SECONDS = 1.5;
/** -1 dBFS. */
const PEAK_TARGET = 0.89;

function arrayBufferOf(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

interface ManifestEntry {
  number: number;
  file: string;
  seconds: number;
  notes: number;
  channels: number[];
  programs: number[];
  devices: string[];
}

const manifest = JSON.parse(readFileSync(join(midiDir, 'manifest.json'), 'utf8')) as ManifestEntry[];
const wavDir = join(outRoot, 'wav');
const oggDir = join(outRoot, 'ogg');
mkdirSync(wavDir, { recursive: true });
mkdirSync(oggDir, { recursive: true });

// One synthesizer for every sound: destroying a processor also destroys the
// sound bank it was given, which would silence everything after the first.
const bank = SoundBankLoader.fromArrayBuffer(arrayBufferOf(readFileSync(sfPath)));
const synth = new SpessaSynthProcessor(RATE, { effectsEnabled: true, eventsEnabled: false, maxBufferSize: BUF });
synth.soundBankManager.addSoundBank(bank, 'main');
await synth.processorInitialized;
synth.setSystemParameter('autoAllocateVoices', true);
const seq = new SpessaSynthSequencer(synth);
seq.loopCount = 0;

for (const m of manifest) {
  const midi = BasicMIDI.fromArrayBuffer(arrayBufferOf(readFileSync(join(midiDir, m.file))), m.file);
  synth.stopAllChannels(true);
  synth.reset();
  seq.loadNewSongList([midi]);
  seq.play();

  const total = Math.ceil((midi.duration + TAIL_SECONDS) * RATE);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  for (let i = 0; i < total; i += BUF) {
    seq.processTick();
    synth.process(left, right, i, Math.min(BUF, total - i));
  }

  // The MT-32 parts run every channel at full volume and velocity, which the
  // soundfont renders far too hot; normalise each sound to -1 dBFS peak.
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  const gain = peak > 0 ? PEAK_TARGET / peak : 1;
  for (let i = 0; i < total; i++) {
    left[i] = left[i]! * gain;
    right[i] = right[i]! * gain;
  }

  const base = m.file.replace(/\.mid$/, '');
  const wavPath = join(wavDir, `${base}.wav`);
  writeFileSync(wavPath, Buffer.from(audioToWav([left, right], RATE, { normalizeAudio: false })));
  const oggPath = join(oggDir, `${base}.ogg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libvorbis', '-q:a', '4', oggPath]);
  console.log(`${base}.ogg  ${midi.duration.toFixed(1)}s  gain ${gain.toFixed(2)}`);
}

// ---- the audition page -----------------------------------------------------
const rows = manifest
  .map(
    (m) => `<tr>
  <td>${m.number}</td>
  <td><audio controls preload="none" src="ogg/${m.file.replace(/\.mid$/, '.ogg')}"></audio></td>
  <td>${m.seconds}s</td><td>${m.notes}</td><td>${m.channels.length}</td>
  <td><input data-n="${m.number}" placeholder="what is it?"></td>
</tr>`,
  )
  .join('\n');
const page = `<!doctype html>
<meta charset="utf-8">
<title>Jones sounds</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 24px; background: #1d1a24; color: #eee; }
  table { border-collapse: collapse; } td, th { padding: 6px 10px; border-bottom: 1px solid #444; }
  input { width: 26em; background: #2a2633; color: #fff; border: 1px solid #555; padding: 4px 6px; }
  textarea { width: 100%; height: 12em; background: #2a2633; color: #fff; border: 1px solid #555; }
  audio { width: 260px; }
</style>
<h1>Jones in the Fast Lane — the 34 sounds</h1>
<p>MT-32 arrangement rendered through a General MIDI soundfont. Play each one and type what it is
(theme, weekend, hired, refused, purchase, door, week end…). Names are kept in this browser; the box
at the bottom holds them as JSON to paste into <code>art/audio/names.json</code>.</p>
<table>
<tr><th>#</th><th>listen</th><th>length</th><th>notes</th><th>channels</th><th>name</th></tr>
${rows}
</table>
<h2>names.json</h2>
<textarea id="out" readonly></textarea>
<script>
  const KEY = 'jones-sound-names';
  const names = JSON.parse(localStorage.getItem(KEY) || '{}');
  const out = document.getElementById('out');
  const render = () => { out.value = JSON.stringify(names, null, 2); };
  for (const input of document.querySelectorAll('input[data-n]')) {
    const n = input.dataset.n;
    input.value = names[n] || '';
    input.addEventListener('input', () => {
      if (input.value.trim()) names[n] = input.value.trim(); else delete names[n];
      localStorage.setItem(KEY, JSON.stringify(names));
      render();
    });
  }
  render();
</script>
`;
writeFileSync(join(outRoot, 'index.html'), page);
console.log(`audition page: ${join(outRoot, 'index.html')}`);

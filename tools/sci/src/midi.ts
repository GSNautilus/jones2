/**
 * Standard MIDI file writer for a parsed SCI sound, plus the MT-32 preset to
 * General MIDI program map. SCI ticks run at 60 Hz, so the file uses 60
 * pulses per quarter note and a tempo of one quarter note per second: one
 * pulse is then exactly one SCI tick.
 */
import type { ParsedSound } from './sound';

export const PPQ = 60;
const MICROSECONDS_PER_QUARTER = 1_000_000;

/**
 * MT-32 preset slot -> General MIDI program, by instrument name. The MT-32's
 * 128 presets are grouped by family (pianos, organs, synth brass, strings,
 * guitars, basses, winds, brass, mallets, percussion); each maps to the
 * nearest GM program.
 */
export const MT32_TO_GM: number[] = [
  0, 1, 0, 2, 4, 4, 5, 3, // acoustic pianos, electric pianos, honky-tonk
  16, 17, 18, 16, 19, 19, 19, 21, // electric organs, pipe organs, accordion
  6, 6, 6, 7, 7, 7, 8, 8, // harpsichords, clavis, celestas
  62, 63, 62, 63, 38, 39, 38, 39, // synth brass, synth bass
  88, 89, 52, 98, 97, 99, 14, 54, // fantasy, harmo pan, chorale, glasses, soundtrack, atmosphere, warm bell, funny vox
  98, 96, 68, 95, 80, 101, 103, 80, // echo bell, ice rain, oboe 2001, echo pan, doctor solo, school daze, bellsinger, square wave
  48, 48, 49, 45, 40, 40, 42, 42, // string sections, pizzicato, violins, cellos
  43, 46, 46, 24, 25, 26, 27, 104, // contrabass, harps, guitars, electric guitars, sitar
  32, 32, 33, 33, 36, 37, 35, 35, // acoustic basses, electric basses, slap basses, fretless
  73, 73, 72, 72, 74, 75, 64, 65, // flutes, piccolos, recorder, pan pipes, saxes
  66, 67, 71, 71, 68, 69, 70, 22, // saxes, clarinets, oboe, english horn, bassoon, harmonica
  56, 56, 57, 57, 60, 60, 58, 61, // trumpets, trombones, french horns, tuba, brass section
  61, 11, 11, 12, 14, 9, 14, 13, // brass section, vibes, synth mallet, windbell, glock, tube bell, xylophone
  12, 107, 111, 77, 78, 78, 76, 76, // marimba, koto, sho, shakuhachi, whistles, bottle blow, breathpipe
  47, 117, 117, 118, 118, 116, 116, 119, // timpani, melodic tom, deep snare, electric percussion, taiko, taiko rim, cymbal
  115, 112, 55, 124, 123, 55, 14, 55, // castanets, triangle, orchestra hit, telephone, bird tweet, one note jam, water bell, jungle tune
];

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    out.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return out;
}

function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function u16(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}

function chunk(tag: string, body: number[]): number[] {
  return [...tag.split('').map((c) => c.charCodeAt(0)), ...u32(body.length), ...body];
}

export interface MidiOptions {
  /** Remap MT-32 program numbers to General MIDI (default true). */
  mapPrograms?: boolean;
}

/** Type 1 SMF: a tempo track, then one track per SCI channel. */
export function toStandardMidi(sound: ParsedSound, opts: MidiOptions = {}): Uint8Array {
  const map = opts.mapPrograms !== false;
  const tracks: number[][] = [];

  const tempo = [...vlq(0), 0xff, 0x51, 0x03, ...u32(MICROSECONDS_PER_QUARTER).slice(1), ...vlq(0), 0xff, 0x2f, 0x00];
  tracks.push(tempo);

  for (const ch of sound.channels) {
    if (ch.events.length === 0) continue;
    const body: number[] = [];
    let last = 0;
    for (const ev of ch.events) {
      const kind = ev.status & 0xf0;
      const midiCh = ch.midiChannel;
      let data = ev.data;
      if (kind === 0xc0 && map && midiCh !== 9) data = [MT32_TO_GM[ev.data[0] ?? 0] ?? ev.data[0] ?? 0];
      body.push(...vlq(Math.max(0, ev.tick - last)), kind | midiCh, ...data);
      last = ev.tick;
    }
    body.push(...vlq(0), 0xff, 0x2f, 0x00);
    tracks.push(body);
  }

  const header = chunk('MThd', [...u16(1), ...u16(tracks.length), ...u16(PPQ)]);
  const out = [...header];
  for (const t of tracks) out.push(...chunk('MTrk', t));
  return Uint8Array.from(out);
}

/** Rough content summary for a manifest: notes, programs used, seconds. */
export function summarise(sound: ParsedSound) {
  let notes = 0;
  const programs = new Set<number>();
  for (const ch of sound.channels) {
    for (const ev of ch.events) {
      const kind = ev.status & 0xf0;
      if (kind === 0x90 && (ev.data[1] ?? 0) > 0) notes++;
      if (kind === 0xc0) programs.add(ev.data[0] ?? 0);
    }
  }
  return { notes, programs: [...programs].sort((a, b) => a - b), seconds: Math.round((sound.ticks / 60) * 10) / 10 };
}

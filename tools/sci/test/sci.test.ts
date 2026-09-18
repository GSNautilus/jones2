import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unpackLZW1 } from '../src/lzw1';
import { MT32_TO_GM, PPQ, summarise, toStandardMidi } from '../src/midi';
import { GameFiles, SOUND, readMap } from '../src/resources';
import { parseSound, readChannel, readTracks } from '../src/sound';

/** Pack MSB-first codes of the given widths into bytes, the way the game does. */
function packCodes(codes: Array<[code: number, bits: number]>): Uint8Array {
  const out: number[] = [];
  let buf = 0;
  let n = 0;
  for (const [code, bits] of codes) {
    buf = (buf << bits) | code;
    n += bits;
    while (n >= 8) {
      out.push((buf >>> (n - 8)) & 0xff);
      n -= 8;
      buf &= (1 << n) - 1;
    }
  }
  if (n > 0) out.push((buf << (8 - n)) & 0xff);
  return Uint8Array.from(out);
}

describe('LZW1', () => {
  it('expands literals, dictionary entries and the KwKwK case', () => {
    // A B <AB> <ABA... KwKwK on the code just about to be defined> end
    const A = 0x41;
    const B = 0x42;
    const packed = packCodes([
      [A, 9],
      [B, 9], // defines 0x102 = "AB"
      [0x102, 9], // "AB", defines 0x103 = "BA"
      [0x104, 9], // not yet defined: previous string "AB" + its first char = "ABA"; defines 0x104 = "ABA"
      [0x101, 9],
    ]);
    const text = Buffer.from(unpackLZW1(packed, 7)).toString('latin1');
    expect(text).toBe('ABABABA');
  });

  it('reports a size mismatch instead of returning a short buffer', () => {
    const packed = packCodes([[0x41, 9], [0x101, 9]]);
    expect(() => unpackLZW1(packed, 5)).toThrow(/expected 5/);
  });
});

describe('resource map', () => {
  it('splits the id and location words and stops at the terminator', () => {
    const bytes = Uint8Array.from([
      0x05, 0x20, 0x10, 0x00, 0x00, 0x04, // type 4 number 5, volume 1 offset 16
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);
    expect(readMap(bytes)).toEqual([{ type: 4, number: 5, volume: 1, offset: 16 }]);
  });
});

describe('sound resource', () => {
  // one device (0x0c), one channel at offset 8 of 9 bytes: ch 1 poly 1, then
  // delta 0 program 5, delta 30 note on 60/100, delta 0xF8+10 note off, end
  const res = Uint8Array.from([
    0x0c, 0x00, 0x00, 0x08, 0x00, 0x0b, 0x00, 0xff, 0xff, // track directory is 9 bytes... pad below
  ]);
  const data = Uint8Array.from([0x01, 0x01, 0x00, 0xc1, 0x05, 0x1e, 0x91, 0x3c, 0x64, 0xf8, 0x0a, 0x3c, 0x00, 0xfc]);
  const bytes = new Uint8Array(res.length + data.length);
  bytes.set(res, 0);
  bytes.set(data, res.length);
  // fix the directory's offset/size to the real data position
  bytes[3] = res.length;
  bytes[5] = data.length;

  it('reads the track directory and a channel with running status and long deltas', () => {
    const tracks = readTracks(bytes);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]!.device).toBe(0x0c);
    const ch = readChannel(bytes, tracks[0]!.channels[0]!);
    expect(ch.midiChannel).toBe(1);
    expect(ch.events.map((e) => [e.tick, e.status, ...e.data])).toEqual([
      [0, 0xc1, 5],
      [30, 0x91, 60, 100],
      [30 + 250, 0x91, 60, 0],
    ]);
  });

  it('writes a type 1 SMF at 60 pulses per quarter with the programs remapped', () => {
    const sound = parseSound(bytes)!;
    const smf = toStandardMidi(sound);
    expect(Buffer.from(smf.subarray(0, 4)).toString('latin1')).toBe('MThd');
    expect((smf[12]! << 8) | smf[13]!).toBe(PPQ);
    expect((smf[10]! << 8) | smf[11]!).toBe(2); // tempo track + one channel
    // MT-32 preset 5 (Elec Piano 3) becomes GM 4 (Electric Piano 1)
    expect(MT32_TO_GM[5]).toBe(4);
    const text = Buffer.from(smf).toString('latin1');
    expect(text).toContain(String.fromCharCode(0xc1, 4));
    expect(summarise(sound)).toEqual({ notes: 1, programs: [5], seconds: 4.7 });
  });

  it('has a full 128-entry program map', () => {
    expect(MT32_TO_GM).toHaveLength(128);
    for (const p of MT32_TO_GM) expect(p >= 0 && p < 128).toBe(true);
  });
});

const GAME = '<folder holding RESOURCE.MAP>';

describe.skipIf(!existsSync(GAME))('the real game files', () => {
  const game = new GameFiles(GAME);

  it('decompresses every sound to its declared size', () => {
    const sounds = game.ofType(SOUND);
    expect(sounds.length).toBe(34);
    for (const e of sounds) {
      const h = game.header(e);
      expect(game.unpack(e).length).toBe(h.unpackedSize);
    }
  });

  it('finds an MT-32 track with notes in every sound', () => {
    for (const e of game.ofType(SOUND)) {
      const s = parseSound(game.unpack(e), [0x0c])!;
      expect(s, `sound ${e.number}`).not.toBeNull();
      expect(s.device).toBe(0x0c);
      expect(summarise(s).notes, `sound ${e.number}`).toBeGreaterThan(0);
    }
  });
});

describe('CD speech', () => {
  it('reads the 10-byte audio map entries and stops at the terminator', async () => {
    const { readAudioMap, wav8 } = await import('../src/voices');
    const bytes = Uint8Array.from([
      0x0a, 0x00, 0x00, 0x00, 0x00, 0x20, 0x0c, 0xe1, 0x00, 0x00, // number 10, offset 0, flag 0x20, size 57612
      0x0b, 0x00, 0x00, 0xe8, 0x00, 0x21, 0x76, 0xb1, 0x00, 0x00, // number 11, offset 59392, flag 0x21, size 45430
      0xff, 0xff, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(readAudioMap(bytes)).toEqual([
      { number: 10, offset: 0, flag: 0x20, size: 57612 },
      { number: 11, offset: 59392, flag: 0x21, size: 45430 },
    ]);
    const wav = wav8(Uint8Array.from([0x80, 0x90, 0x70]), 11025);
    expect(Buffer.from(wav.subarray(0, 4)).toString('latin1')).toBe('RIFF');
    expect(wav.length).toBe(44 + 3);
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(11025);
    expect(new DataView(wav.buffer).getUint16(34, true)).toBe(8);
  });
});

const CD = 'C:/Users/Nautilus/Projects/Jones 2/Jones3x/CD';

describe.skipIf(!existsSync(CD))('the CD edition files', () => {
  it('opens the map with 28-bit offsets and finds the text resources', () => {
    const game = new GameFiles(CD);
    expect(game.ofType(3).length).toBe(41);
    expect(game.unpack(game.ofType(3)[0]!).length).toBeGreaterThan(0);
  });
});

/**
 * Reading Sierra SCI resource files of the SCI0/SCI01/SCI1-early layout, as
 * used by the floppy release of Jones in the Fast Lane (1991):
 *
 * - RESOURCE.MAP: 6-byte entries, `type<<11 | number` then `volume<<26 | offset`,
 *   terminated by six 0xFF bytes.
 * - RESOURCE.00N: each resource starts with an 8-byte header: the same id word,
 *   the packed size, the unpacked size, and the compression method
 *   (0 = stored, 1 = LZW, 2 = LZW1). The packed size counts the four bytes
 *   after it, so the payload is `packed - 4` bytes.
 *
 * Only what the sound extraction needs is implemented: stored and LZW1.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unpackLZW1 } from './lzw1';

export const TYPE_NAMES: Record<number, string> = {
  0: 'view',
  1: 'pic',
  2: 'script',
  3: 'text',
  4: 'sound',
  5: 'memory',
  6: 'vocab',
  7: 'font',
  8: 'cursor',
  9: 'patch',
  10: 'bitmap',
  11: 'palette',
};

export const SOUND = 4;
export const PATCH = 9;

export interface MapEntry {
  type: number;
  number: number;
  volume: number;
  offset: number;
}

export interface ResourceHeader {
  type: number;
  number: number;
  packedSize: number;
  unpackedSize: number;
  method: number;
}

export function readMap(bytes: Uint8Array): MapEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: MapEntry[] = [];
  for (let i = 0; i + 6 <= bytes.length; i += 6) {
    const id = view.getUint16(i, true);
    const loc = view.getUint32(i + 2, true);
    if (id === 0xffff && loc === 0xffffffff) break;
    out.push({ type: id >> 11, number: id & 0x7ff, volume: loc >>> 26, offset: loc & 0x3ffffff });
  }
  return out;
}

export function readHeader(vol: Uint8Array, offset: number): ResourceHeader {
  const view = new DataView(vol.buffer, vol.byteOffset, vol.byteLength);
  const id = view.getUint16(offset, true);
  return {
    type: id >> 11,
    number: id & 0x7ff,
    packedSize: view.getUint16(offset + 2, true),
    unpackedSize: view.getUint16(offset + 4, true),
    method: view.getUint16(offset + 6, true),
  };
}

/** A game directory opened once: the map and every volume it names. */
export class GameFiles {
  readonly entries: MapEntry[];
  private readonly volumes = new Map<number, Uint8Array>();

  constructor(readonly dir: string) {
    this.entries = readMap(new Uint8Array(readFileSync(join(dir, 'RESOURCE.MAP'))));
    for (const v of new Set(this.entries.map((e) => e.volume))) {
      this.volumes.set(v, new Uint8Array(readFileSync(join(dir, `RESOURCE.${String(v).padStart(3, '0')}`))));
    }
  }

  ofType(type: number): MapEntry[] {
    // The map can list a resource twice (once per volume); keep the first.
    const seen = new Set<number>();
    return this.entries.filter((e) => e.type === type && !seen.has(e.number) && seen.add(e.number) !== undefined);
  }

  header(e: MapEntry): ResourceHeader {
    return readHeader(this.volumes.get(e.volume)!, e.offset);
  }

  /** The resource's bytes, decompressed. */
  unpack(e: MapEntry): Uint8Array {
    const vol = this.volumes.get(e.volume)!;
    const h = readHeader(vol, e.offset);
    if (h.type !== e.type || h.number !== e.number) {
      throw new Error(`resource ${e.type}.${e.number}: header says ${h.type}.${h.number}`);
    }
    const start = e.offset + 8;
    const packed = vol.subarray(start, start + h.packedSize - 4);
    switch (h.method) {
      case 0:
        return packed.slice(0, h.unpackedSize);
      case 2:
        return unpackLZW1(packed, h.unpackedSize);
      default:
        throw new Error(`resource ${e.type}.${e.number}: compression method ${h.method} not supported`);
    }
  }
}

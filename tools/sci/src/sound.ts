/**
 * The SCI1 sound resource, as found in Jones in the Fast Lane's files.
 *
 * Layout: a list of TRACKS, one per sound device, each `deviceId` byte
 * followed by 6-byte channel entries (2 bytes unused/priority, 2 bytes
 * offset, 2 bytes size) up to 0xFF; the list ends with a 0xFF device id.
 * Each channel's data starts with two bytes (MIDI channel number in the low
 * nibble of the first, polyphony in the low nibble of the second) and then a
 * MIDI-like event stream: a delta time in 60 Hz ticks (0xF8 means "240 more,
 * keep reading"), then a status byte or, with running status, the first data
 * byte. 0xFC ends the stream.
 */

export const DEVICE_NAMES: Record<number, string> = {
  0x00: 'adlib',
  0x06: 'amiga',
  0x07: 'gm',
  0x09: 'cms',
  0x0c: 'mt32',
  0x12: 'pcspeaker',
  0x13: 'tandy',
};

export interface ChannelRef {
  priority: number;
  offset: number;
  size: number;
}

export interface Track {
  device: number;
  channels: ChannelRef[];
}

export interface SoundEvent {
  /** Absolute time in 60 Hz ticks. */
  tick: number;
  /** MIDI status byte with the channel nibble as authored. */
  status: number;
  data: number[];
}

export interface ParsedChannel {
  midiChannel: number;
  flags: number;
  poly: number;
  events: SoundEvent[];
}

/** The track directory at the head of the resource. */
export function readTracks(bytes: Uint8Array): Track[] {
  const tracks: Track[] = [];
  let i = 0;
  while (i < bytes.length && bytes[i] !== 0xff) {
    const device = bytes[i++]!;
    const channels: ChannelRef[] = [];
    while (i < bytes.length && bytes[i] !== 0xff) {
      const priority = bytes[i]! | (bytes[i + 1]! << 8);
      const offset = bytes[i + 2]! | (bytes[i + 3]! << 8);
      const size = bytes[i + 4]! | (bytes[i + 5]! << 8);
      channels.push({ priority, offset, size });
      i += 6;
    }
    i++; // the 0xFF closing this track
    tracks.push({ device, channels });
  }
  return tracks;
}

const DATA_BYTES: Record<number, number> = { 0x80: 2, 0x90: 2, 0xa0: 2, 0xb0: 2, 0xc0: 1, 0xd0: 1, 0xe0: 2 };

/** One channel's event stream, with absolute ticks. */
export function readChannel(bytes: Uint8Array, ref: ChannelRef): ParsedChannel {
  const data = bytes.subarray(ref.offset, ref.offset + ref.size);
  const head0 = data[0] ?? 0;
  const head1 = data[1] ?? 0;
  const ch: ParsedChannel = { midiChannel: head0 & 0x0f, flags: head0 >> 4, poly: head1 & 0x0f, events: [] };
  let i = 2;
  let tick = 0;
  let running = 0;
  while (i < data.length) {
    // delta time
    let delta = 0;
    let b = data[i++]!;
    while (b === 0xf8) {
      delta += 240;
      if (i >= data.length) return ch;
      b = data[i++]!;
    }
    delta += b;
    tick += delta;
    if (i >= data.length) break;
    let status = data[i]!;
    if (status === 0xfc) break; // end of stream
    if (status & 0x80) {
      i++;
      if (status === 0xf0) {
        // sysex: skip to 0xF7
        while (i < data.length && data[i] !== 0xf7) i++;
        i++;
        continue;
      }
      if (status >= 0xf0) continue; // other system bytes carry no data here
      running = status;
    } else {
      status = running;
      if (!status) break; // data byte with no status to run under
    }
    const n = DATA_BYTES[status & 0xf0] ?? 0;
    const args: number[] = [];
    for (let k = 0; k < n && i < data.length; k++) args.push(data[i++]! & 0x7f);
    ch.events.push({ tick, status, data: args });
  }
  return ch;
}

export interface ParsedSound {
  device: number;
  channels: ParsedChannel[];
  /** Length of the longest channel, in 60 Hz ticks. */
  ticks: number;
}

/** Parse the track for `device` (or the first device that has one). */
export function parseSound(bytes: Uint8Array, preferred: number[] = [0x0c, 0x07, 0x00]): ParsedSound | null {
  const tracks = readTracks(bytes);
  const pick = preferred.map((d) => tracks.find((t) => t.device === d)).find((t) => t) ?? tracks[0];
  if (!pick) return null;
  const channels = pick.channels.map((c) => readChannel(bytes, c));
  const ticks = Math.max(0, ...channels.map((c) => c.events[c.events.length - 1]?.tick ?? 0));
  return { device: pick.device, channels, ticks };
}

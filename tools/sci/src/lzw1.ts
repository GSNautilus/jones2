/**
 * The "LZW1" decompressor Sierra's SCI01/SCI1 interpreters used for most
 * resources (compression method 2 in the 8-byte volume header). Standard
 * LZW with MSB-first codes that grow from 9 to 12 bits: 0x100 resets the
 * dictionary, 0x101 ends the stream, new entries start at 0x102, and the
 * code width steps up when the next free code reaches the current maximum.
 *
 * The decompressed size is known from the header, so the loop stops there
 * and a mismatch is reported as an error rather than trusted.
 */

class BitReader {
  private pos = 0;
  private buf = 0;
  private bits = 0;
  constructor(private readonly src: Uint8Array) {}

  /** Next `n` bits, most significant first. Past the end reads zeros. */
  read(n: number): number {
    while (this.bits < n) {
      const byte = this.pos < this.src.length ? this.src[this.pos]! : 0;
      this.pos++;
      this.buf = ((this.buf << 8) | byte) >>> 0;
      this.bits += 8;
    }
    const out = (this.buf >>> (this.bits - n)) & ((1 << n) - 1);
    this.bits -= n;
    this.buf &= (1 << this.bits) - 1;
    return out;
  }
}

export function unpackLZW1(src: Uint8Array, unpackedSize: number): Uint8Array {
  const out = new Uint8Array(unpackedSize);
  let written = 0;
  const reader = new BitReader(src);
  // dictionary: for code c >= 0x102, data[c] is the last byte and next[c] the prefix code
  const data = new Uint8Array(0x1000);
  const next = new Uint16Array(0x1000);
  const stack = new Uint8Array(0x1010);

  let numBits = 9;
  let curToken = 0x102;
  let endToken = 0x1ff;
  let lastChar = 0;
  let lastCode = 0;
  let haveLast = false;

  while (written < unpackedSize) {
    const code = reader.read(numBits);
    if (code === 0x101) break; // end of stream
    if (code === 0x100) {
      numBits = 9;
      curToken = 0x102;
      endToken = 0x1ff;
      haveLast = false;
      continue;
    }
    if (!haveLast) {
      lastChar = code & 0xff;
      out[written++] = lastChar;
      lastCode = code;
      haveLast = true;
      continue;
    }
    let sp = 0;
    let c = code;
    if (c >= curToken) {
      // KwKwK: the string is the previous one plus its own first character
      stack[sp++] = lastChar;
      c = lastCode;
    }
    while (c >= 0x102) {
      stack[sp++] = data[c]!;
      c = next[c]!;
    }
    stack[sp++] = c;
    lastChar = c;
    while (sp > 0 && written < unpackedSize) out[written++] = stack[--sp]!;
    if (curToken <= endToken) {
      data[curToken] = lastChar;
      next[curToken] = lastCode;
      curToken++;
      if (curToken === endToken && numBits < 12) {
        numBits++;
        endToken = (endToken << 1) + 1;
      }
    }
    lastCode = code;
  }
  if (written !== unpackedSize) {
    throw new Error(`LZW1: produced ${written} bytes, expected ${unpackedSize}`);
  }
  return out;
}

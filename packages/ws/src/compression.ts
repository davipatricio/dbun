import * as zlib from "node:zlib";

export type CompressionMode = "zlib-stream" | "zstd-stream" | null;

export interface Decompressor {
  decompress(data: Buffer): Buffer;
  reset(): void;
  destroy(): void;
}

export function createDecompressor(mode: CompressionMode): Decompressor | null {
  if (mode === "zlib-stream") return new ZlibStreamDecompressor();
  if (mode === "zstd-stream") return new ZstdStreamDecompressor();
  return null;
}

const ZLIB_SUFFIX = Buffer.from([0x00, 0x00, 0xff, 0xff]);

class ZlibStreamDecompressor implements Decompressor {
  private inflate: zlib.Inflate;
  private buffer = Buffer.alloc(0);

  constructor() {
    this.inflate = zlib.createInflate();
  }

  decompress(data: Buffer): Buffer {
    this.buffer = Buffer.concat([this.buffer, data]);

    if (this.buffer.length < 4 || !this.buffer.subarray(-4).equals(ZLIB_SUFFIX)) {
      return Buffer.alloc(0);
    }

    const chunks: Buffer[] = [];
    this.inflate.write(this.buffer);
    this.inflate.flush(zlib.constants.Z_SYNC_FLUSH);

    let chunk: Buffer | null;
    while ((chunk = this.inflate.read() as Buffer | null) !== null) {
      chunks.push(chunk);
    }

    this.buffer = Buffer.alloc(0);
    return Buffer.concat(chunks);
  }

  reset(): void {
    this.inflate.close();
    this.inflate = zlib.createInflate();
    this.buffer = Buffer.alloc(0);
  }

  destroy(): void {
    this.inflate.close();
    this.buffer = Buffer.alloc(0);
  }
}

const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

class ZstdStreamDecompressor implements Decompressor {
  private buffer = Buffer.alloc(0);

  decompress(data: Buffer): Buffer {
    this.buffer = Buffer.concat([this.buffer, data]);

    const frames = this.splitFrames();

    if (frames.length === 0) return Buffer.alloc(0);

    const result: Buffer[] = [];
    for (const frame of frames) {
      result.push(Buffer.from(Bun.zstdDecompressSync(frame)));
    }

    return Buffer.concat(result);
  }

  private splitFrames(): Buffer[] {
    const frames: Buffer[] = [];
    let offset = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const magicIdx = this.findMagic(offset);
      if (magicIdx === -1) break;

      if (magicIdx > offset) {
        offset = magicIdx;
      }

      const nextMagicIdx = this.findMagic(magicIdx + 4);
      const end = nextMagicIdx === -1 ? this.buffer.length : nextMagicIdx;

      frames.push(this.buffer.subarray(magicIdx, end));
      offset = end;

      if (nextMagicIdx === -1) break;
    }

    this.buffer = this.buffer.subarray(offset);
    return frames;
  }

  private findMagic(from: number): number {
    for (let i = from; i <= this.buffer.length - 4; i++) {
      if (
        this.buffer[i] === ZSTD_MAGIC[0] &&
        this.buffer[i + 1] === ZSTD_MAGIC[1] &&
        this.buffer[i + 2] === ZSTD_MAGIC[2] &&
        this.buffer[i + 3] === ZSTD_MAGIC[3]
      ) {
        return i;
      }
    }
    return -1;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }

  destroy(): void {
    this.buffer = Buffer.alloc(0);
  }
}

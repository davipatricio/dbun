export type EncodingMode = "json" | "etf";

export function encode(data: unknown, encoding: EncodingMode): string | Buffer {
  if (encoding === "etf") return encodeETF(data);
  return JSON.stringify(data);
}

export function decode(data: string | Buffer, encoding: EncodingMode): unknown {
  if (encoding === "etf") return decodeETF(typeof data === "string" ? Buffer.from(data) : data);
  return JSON.parse(typeof data === "string" ? data : data.toString());
}

function encodeETF(data: unknown): Buffer {
  const parts: Buffer[] = [];
  parts.push(Buffer.from([131]));
  writeTerm(data, parts);
  return Buffer.concat(parts);
}

function writeTerm(value: unknown, parts: Buffer[]): void {
  if (value === null || value === undefined) {
    parts.push(Buffer.from([131, 100, 0, 3, 110, 105, 108]));
    return;
  }
  if (typeof value === "boolean") {
    const atom = value ? "true" : "false";
    parts.push(Buffer.from([100, 0, atom.length]));
    parts.push(Buffer.from(atom));
    return;
  }
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 0 && value <= 255) {
      parts.push(Buffer.from([97, value]));
      return;
    }
    if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
      const buf = Buffer.alloc(5);
      buf[0] = 98;
      buf.writeInt32BE(value, 1);
      parts.push(buf);
      return;
    }
    const fbuf = Buffer.alloc(32);
    fbuf[0] = 99;
    fbuf.write(value.toString(), 1, 31, "ascii");
    fbuf[31] = 0;
    parts.push(fbuf);
    return;
  }
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf-8");
    if (bytes.length < 65536) {
      const buf = Buffer.alloc(3);
      buf[0] = 107;
      buf.writeUInt16BE(bytes.length, 1);
      parts.push(buf);
      parts.push(bytes);
    } else {
      const buf = Buffer.alloc(5);
      buf[0] = 109;
      buf.writeUInt32BE(bytes.length, 1);
      parts.push(buf);
      parts.push(bytes);
    }
    return;
  }
  if (Array.isArray(value)) {
    const buf = Buffer.alloc(5);
    buf[0] = 108;
    buf.writeUInt32BE(value.length, 1);
    parts.push(buf);
    for (const item of value) {
      writeTerm(item, parts);
    }
    parts.push(Buffer.from([106]));
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const buf = Buffer.alloc(5);
    buf[0] = 116;
    buf.writeUInt32BE(entries.length, 1);
    parts.push(buf);
    for (const [key, val] of entries) {
      writeTerm(key, parts);
      writeTerm(val, parts);
    }
    return;
  }
}

function decodeETF(buffer: Buffer): unknown {
  if (buffer[0] !== 131) throw new Error("Invalid ETF version");
  const reader = new ETFReader(buffer, 1);
  return reader.readTerm();
}

class ETFReader {
  private offset: number;

  constructor(
    private buffer: Buffer,
    offset: number,
  ) {
    this.offset = offset;
  }

  readTerm(): unknown {
    const tag = this.buffer[this.offset++]!;
    switch (tag) {
      case 97:
        return this.buffer[this.offset++]!;
      case 98: {
        const val = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return val;
      }
      case 99: {
        const str = this.buffer.toString("ascii", this.offset, this.offset + 31).replace(/\0/g, "");
        this.offset += 31;
        return parseFloat(str);
      }
      case 100:
      case 118:
      case 119: {
        const len =
          tag === 100
            ? this.buffer.readUInt16BE(this.offset)
            : tag === 118
              ? this.buffer.readUInt16BE(this.offset)
              : this.buffer[this.offset]!;
        this.offset += tag === 119 ? 1 : 2;
        const atom = this.buffer.toString("binary", this.offset, this.offset + len);
        this.offset += len;
        if (atom === "nil" || atom === "undefined") return null;
        if (atom === "true") return true;
        if (atom === "false") return false;
        return atom;
      }
      case 107: {
        const len = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        const str = this.buffer.toString("utf-8", this.offset, this.offset + len);
        this.offset += len;
        return str;
      }
      case 108: {
        const len = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        const arr: unknown[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readTerm());
        if (this.buffer[this.offset] === 106) this.offset++;
        return arr;
      }
      case 106:
        return [];
      case 109: {
        const len = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        const str = this.buffer.toString("utf-8", this.offset, this.offset + len);
        this.offset += len;
        return str;
      }
      case 110: {
        const n = this.buffer[this.offset++]!;
        const sign = this.buffer[this.offset++]!;
        let num = 0;
        for (let i = n - 1; i >= 0; i--) {
          num = num * 256 + this.buffer[this.offset + i]!;
        }
        this.offset += n;
        return sign === 1 ? -num : num;
      }
      case 116: {
        const len = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < len; i++) {
          const key = this.readTerm() as string;
          const val = this.readTerm();
          obj[key] = val;
        }
        return obj;
      }
      default:
        throw new Error(`Unsupported ETF tag: ${tag} at offset ${this.offset - 1}`);
    }
  }
}

/**
 * Just enough of the SAGE .map format (BfME2 / Age of the Ring) to place
 * the start rings on a map's lobby preview: the playable extent and the
 * Player_N_Start waypoints, in the same world units mapcache.ini uses.
 */

/** EA's RefPack, the compression behind an "EAR\0" .map header. */
const decompressRefPack = (data: Uint8Array): Uint8Array => {
  const flags = data[0] as number;
  if (data[1] !== 0xfb) {
    throw new Error('Not a RefPack stream');
  }
  const sizeBytes = flags & 0x80 ? 4 : 3;
  let pos = 2 + (flags & 0x01 ? sizeBytes : 0);
  let outSize = 0;
  for (let i = 0; i < sizeBytes; i++) {
    outSize = outSize * 256 + (data[pos + i] as number);
  }
  pos += sizeBytes;
  const out = new Uint8Array(outSize);
  let o = 0;
  while (pos < data.length) {
    const b0 = data[pos] as number;
    let literal: number;
    let copy = 0;
    let offset = 0;
    if (b0 < 0x80) {
      const b1 = data[pos + 1] as number;
      pos += 2;
      literal = b0 & 0x03;
      copy = ((b0 & 0x1c) >> 2) + 3;
      offset = ((b0 & 0x60) << 3) + b1 + 1;
    } else if (b0 < 0xc0) {
      const b1 = data[pos + 1] as number;
      const b2 = data[pos + 2] as number;
      pos += 3;
      literal = b1 >> 6;
      copy = (b0 & 0x3f) + 4;
      offset = ((b1 & 0x3f) << 8) + b2 + 1;
    } else if (b0 < 0xe0) {
      const b1 = data[pos + 1] as number;
      const b2 = data[pos + 2] as number;
      const b3 = data[pos + 3] as number;
      pos += 4;
      literal = b0 & 0x03;
      copy = ((b0 & 0x0c) << 6) + b3 + 5;
      offset = ((b0 & 0x10) << 12) + (b1 << 8) + b2 + 1;
    } else if (b0 < 0xfc) {
      pos += 1;
      literal = ((b0 & 0x1f) << 2) + 4;
    } else {
      pos += 1;
      literal = b0 & 0x03;
    }
    out.set(data.subarray(pos, pos + literal), o);
    o += literal;
    pos += literal;
    for (let i = 0; i < copy; i++) {
      out[o] = out[o - offset] as number;
      o++;
    }
    if (b0 >= 0xfc) {
      break;
    }
  }
  return out.subarray(0, o);
};

type MapStarts = {
  /** Playable size in world units (mapcache's extentMax − extentMin). */
  width: number;
  height: number;
  /** Player_1_Start…Player_8_Start, in order, relative to the playable origin. */
  starts: { x: number; y: number }[];
};

const latin1 = new TextDecoder('latin1');

/** Extent and start positions, or null when the file isn't a map we can read. */
const readMapStarts = (raw: Uint8Array): MapStarts | null => {
  const isEar =
    raw[0] === 0x45 && raw[1] === 0x41 && raw[2] === 0x52 && raw[3] === 0;
  const bytes = isEar ? decompressRefPack(raw.subarray(8)) : raw;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (latin1.decode(bytes.subarray(0, 4)) !== 'CkMp') {
    return null;
  }

  // The table of chunk and property names, indexed by id.
  const names = new Map<number, string>();
  let pos = 8;
  for (let n = view.getUint32(4, true); n > 0; n--) {
    const length = bytes[pos] as number;
    const name = latin1.decode(bytes.subarray(pos + 1, pos + 1 + length));
    pos += 1 + length;
    names.set(view.getUint32(pos, true), name);
    pos += 4;
  }

  let extent: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null = null;
  const starts = new Map<number, { x: number; y: number }>();

  const readString = (at: number) => {
    const length = view.getUint16(at, true);
    return {
      value: latin1.decode(bytes.subarray(at + 2, at + 2 + length)),
      end: at + 2 + length,
    };
  };

  /** One "Object": position, then its properties, of which only waypointName matters. */
  const readObject = (start: number) => {
    const x = view.getFloat32(start, true);
    const y = view.getFloat32(start + 4, true);
    let at = readString(start + 20).end;
    const count = view.getUint16(at, true);
    at += 2;
    for (let i = 0; i < count; i++) {
      const type = bytes[at] as number;
      const key = names.get(
        (bytes[at + 1] as number) |
          ((bytes[at + 2] as number) << 8) |
          ((bytes[at + 3] as number) << 16),
      );
      at += 4;
      if (type === 0) {
        at += 1;
      } else if (type === 1 || type === 2) {
        at += 4;
      } else if (type === 3 || type === 5) {
        const text = readString(at);
        const match =
          key === 'waypointName'
            ? /^Player_([1-8])_Start$/.exec(text.value)
            : null;
        if (match) {
          starts.set(Number(match[1]), { x, y });
        }
        at = text.end;
      } else if (type === 4) {
        at += 2 + view.getUint16(at, true) * 2;
      } else {
        return;
      }
    }
  };

  while (pos + 10 <= bytes.length) {
    const name = names.get(view.getUint32(pos, true));
    const version = view.getUint16(pos + 4, true);
    const size = view.getUint32(pos + 6, true);
    const data = pos + 10;
    if (name === 'HeightMapData') {
      // width, height, border width, then the playable borders: the
      // first one is the area the lobby preview shows.
      const borderCount = view.getUint32(data + 12, true);
      if (borderCount > 0) {
        const corner = version >= 6;
        const at = data + 16;
        const minX = corner ? view.getUint32(at, true) : 0;
        const minY = corner ? view.getUint32(at + 4, true) : 0;
        const maxX = view.getUint32(at + (corner ? 8 : 0), true);
        const maxY = view.getUint32(at + (corner ? 12 : 4), true);
        extent = {
          minX: minX * 10,
          minY: minY * 10,
          maxX: maxX * 10,
          maxY: maxY * 10,
        };
      }
    } else if (name === 'ObjectsList') {
      let at = data;
      while (at + 10 <= data + size) {
        const objectSize = view.getUint32(at + 6, true);
        if (names.get(view.getUint32(at, true)) === 'Object') {
          readObject(at + 10);
        }
        at += 10 + objectSize;
      }
    }
    pos = data + size;
  }

  const area = extent as {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
  if (!area || starts.size === 0) {
    return null;
  }
  const width = area.maxX - area.minX;
  const height = area.maxY - area.minY;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    width,
    height,
    starts: [...starts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, point]) => ({ x: point.x - area.minX, y: point.y - area.minY })),
  };
};

export { type MapStarts, readMapStarts };

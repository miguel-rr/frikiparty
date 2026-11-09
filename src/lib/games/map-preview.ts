/**
 * A map's lobby preview, read in the browser from the zip about to be
 * uploaded: no library, only the bytes we need. The zip's central
 * directory says where each entry lives, the .tga is inflated with the
 * browser's own DecompressionStream, decoded by hand and redrawn as a
 * JPEG thumbnail.
 *
 * Which image: <map>_art.tga is what the game shows in the lobby (the
 * parchment drawing); <map>_pic.tga, the loading screen, is the fallback,
 * and any other .tga the last resort. On the lobby art go the start
 * rings, as the lobby draws them, from the waypoints in the .map.
 */

import { type MapStarts, readMapStarts } from '@/lib/games/sage-map';

const THUMBNAIL_MAX_SIDE = 512;
// Transparent pixels of the lobby art sit on parchment in the game.
const THUMBNAIL_BACKGROUND = '#ece0c0';
// Past this, a zip isn't a map pack: don't go looking.
const MAP_ZIP_MAX_BYTES = 2 * 1024 * 1024 * 1024;

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const readBytes = async (file: Blob, start: number, end: number) =>
  new DataView(await file.slice(start, end).arrayBuffer());

/** The central directory's entries, or null when the file isn't a (plain, non-zip64) zip. */
const listZipEntries = async (file: Blob): Promise<ZipEntry[] | null> => {
  const tailStart = Math.max(0, file.size - 65_557);
  const tail = await readBytes(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    return null;
  }
  const directorySize = tail.getUint32(eocd + 12, true);
  const directoryOffset = tail.getUint32(eocd + 16, true);
  if (directoryOffset === 0xffffffff || directorySize === 0xffffffff) {
    return null;
  }
  const directory = await readBytes(
    file,
    directoryOffset,
    directoryOffset + directorySize,
  );
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let at = 0;
  while (at + 46 <= directory.byteLength) {
    if (directory.getUint32(at, true) !== 0x02014b50) {
      break;
    }
    const nameLength = directory.getUint16(at + 28, true);
    const extraLength = directory.getUint16(at + 30, true);
    const commentLength = directory.getUint16(at + 32, true);
    entries.push({
      name: decoder.decode(
        new Uint8Array(
          directory.buffer,
          directory.byteOffset + at + 46,
          nameLength,
        ),
      ),
      method: directory.getUint16(at + 10, true),
      compressedSize: directory.getUint32(at + 20, true),
      localHeaderOffset: directory.getUint32(at + 42, true),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

/** An entry's bytes: stored as is (method 0) or deflated (8). */
const readZipEntry = async (
  file: Blob,
  entry: ZipEntry,
): Promise<Uint8Array | null> => {
  const header = await readBytes(
    file,
    entry.localHeaderOffset,
    entry.localHeaderOffset + 30,
  );
  if (header.getUint32(0, true) !== 0x04034b50) {
    return null;
  }
  const start =
    entry.localHeaderOffset +
    30 +
    header.getUint16(26, true) +
    header.getUint16(28, true);
  const data = file.slice(start, start + entry.compressedSize);
  if (entry.method === 0) {
    return new Uint8Array(await data.arrayBuffer());
  }
  if (entry.method !== 8) {
    return null;
  }
  const inflated = data
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
};

/**
 * Truecolour (types 2 and 10, RLE) and greyscale (3 and 11) TGA at 8,
 * 24 or 32 bits, either origin. Anything else (colour-mapped, 16-bit)
 * comes back null.
 */
const decodeTga = (bytes: Uint8Array): ImageData | null => {
  if (bytes.length < 18) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const idLength = bytes[0] as number;
  const colorMapType = bytes[1] as number;
  const type = bytes[2] as number;
  const colorMapLength = view.getUint16(5, true);
  const colorMapEntryBits = bytes[7] as number;
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const bits = bytes[16] as number;
  const descriptor = bytes[17] as number;
  const greyscale = type === 3 || type === 11;
  const rle = type === 10 || type === 11;
  const supported =
    (type === 2 || type === 10 || greyscale) &&
    (greyscale ? bits === 8 : bits === 24 || bits === 32);
  if (!supported || width === 0 || height === 0) {
    return null;
  }
  const pixelBytes = bits / 8;
  let at =
    18 +
    idLength +
    (colorMapType === 1
      ? colorMapLength * Math.ceil(colorMapEntryBits / 8)
      : 0);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const count = width * height;
  let anyAlpha = false;

  const put = (index: number, from: number) => {
    const o = index * 4;
    if (greyscale) {
      const v = bytes[from] as number;
      pixels[o] = v;
      pixels[o + 1] = v;
      pixels[o + 2] = v;
      pixels[o + 3] = 255;
      return;
    }
    pixels[o] = bytes[from + 2] as number;
    pixels[o + 1] = bytes[from + 1] as number;
    pixels[o + 2] = bytes[from] as number;
    const alpha = pixelBytes === 4 ? (bytes[from + 3] as number) : 255;
    pixels[o + 3] = alpha;
    if (pixelBytes === 4 && alpha > 0) {
      anyAlpha = true;
    }
  };

  let index = 0;
  while (index < count) {
    if (at >= bytes.length) {
      return null;
    }
    if (!rle) {
      put(index++, at);
      at += pixelBytes;
      continue;
    }
    const packet = bytes[at++] as number;
    const run = (packet & 0x7f) + 1;
    if (packet & 0x80) {
      for (let i = 0; i < run && index < count; i++) {
        put(index++, at);
      }
      at += pixelBytes;
    } else {
      for (let i = 0; i < run && index < count; i++) {
        put(index++, at);
        at += pixelBytes;
      }
    }
  }

  // A 32-bit file whose alpha is all zero simply doesn't use it.
  if (pixelBytes === 4 && !anyAlpha) {
    for (let i = 3; i < pixels.length; i += 4) {
      pixels[i] = 255;
    }
  }
  // Bottom-left origin unless bit 5 says top-left: flip the rows.
  if (!(descriptor & 0x20)) {
    const row = width * 4;
    const swap = new Uint8ClampedArray(row);
    for (let y = 0; y < height >> 1; y++) {
      const top = y * row;
      const bottom = (height - 1 - y) * row;
      swap.set(pixels.subarray(top, top + row));
      pixels.copyWithin(top, bottom, bottom + row);
      pixels.set(swap, bottom);
    }
  }
  return new ImageData(pixels, width, height);
};

const tgaRank = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('__macosx/') || !lower.endsWith('.tga')) {
    return -1;
  }
  if (lower.endsWith('_art.tga')) {
    return 0;
  }
  if (lower.endsWith('_pic.tga')) {
    return 1;
  }
  return 2;
};

/**
 * The lobby's start marker: a black disc in a gold ring, about a seventh
 * of the preview across (measured on a lobby capture).
 */
const drawStartRings = (
  context: CanvasRenderingContext2D,
  side: { width: number; height: number },
  map: MapStarts,
) => {
  const outer = Math.min(side.width, side.height) * 0.07;
  const band = outer * 0.24;
  for (const start of map.starts) {
    // World y grows northwards; the preview has north at the top.
    const x = (start.x / map.width) * side.width;
    const y = (1 - start.y / map.height) * side.height;
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.55)';
    context.shadowBlur = outer * 0.35;
    context.shadowOffsetX = outer * 0.06;
    context.shadowOffsetY = outer * 0.1;
    const gold = context.createLinearGradient(x, y - outer, x, y + outer);
    gold.addColorStop(0, '#f6d465');
    gold.addColorStop(0.5, '#d9a21f');
    gold.addColorStop(1, '#9c6a12');
    context.fillStyle = gold;
    context.beginPath();
    context.arc(x, y, outer, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = '#000';
    context.beginPath();
    context.arc(x, y, outer - band, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = Math.max(1, outer * 0.05);
    context.strokeStyle = '#4a3208';
    context.beginPath();
    context.arc(x, y, outer, 0, Math.PI * 2);
    context.stroke();
  }
};

/** Any drawable source scaled to fit the thumbnail, on parchment, as JPEG. */
const toThumbnail = async (
  source: CanvasImageSource,
  width: number,
  height: number,
  rings: MapStarts | null = null,
): Promise<Blob | null> => {
  const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  context.fillStyle = THUMBNAIL_BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (rings) {
    drawStartRings(context, canvas, rings);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
};

const folderOf = (name: string) => name.slice(0, name.lastIndexOf('/') + 1);

/** The start positions from the .map next to the lobby art; null if unreadable (no rings, nothing else lost). */
const startsFor = async (
  file: File,
  entries: ZipEntry[],
  artName: string,
): Promise<MapStarts | null> => {
  const maps = entries.filter((entry) =>
    entry.name.toLowerCase().endsWith('.map'),
  );
  const map =
    maps.find((entry) => folderOf(entry.name) === folderOf(artName)) ??
    (maps.length === 1 ? maps[0] : undefined);
  if (!map) {
    return null;
  }
  try {
    const bytes = await readZipEntry(file, map);
    return bytes ? readMapStarts(bytes) : null;
  } catch {
    return null;
  }
};

/** The lobby preview of the map inside a zip, as a JPEG; null when there's none to find. */
const mapPreviewFromZip = async (file: File): Promise<Blob | null> => {
  if (
    !file.name.toLowerCase().endsWith('.zip') ||
    file.size > MAP_ZIP_MAX_BYTES ||
    typeof DecompressionStream === 'undefined'
  ) {
    return null;
  }
  try {
    const entries = await listZipEntries(file);
    const candidates = (entries ?? [])
      .filter((entry) => tgaRank(entry.name) >= 0)
      .sort((a, b) => tgaRank(a.name) - tgaRank(b.name));
    for (const entry of candidates) {
      const bytes = await readZipEntry(file, entry);
      const image = bytes ? decodeTga(bytes) : null;
      if (!image) {
        continue;
      }
      const rings =
        tgaRank(entry.name) === 0
          ? await startsFor(file, entries ?? [], entry.name)
          : null;
      const bitmap = await createImageBitmap(image);
      return await toThumbnail(bitmap, image.width, image.height, rings);
    }
  } catch {
    // A damaged or unusual zip just means no preview.
  }
  return null;
};

/** A picture picked by hand, scaled down to the same JPEG thumbnail. */
const thumbnailFromImage = async (file: File): Promise<Blob | null> => {
  try {
    const bitmap = await createImageBitmap(file);
    return await toThumbnail(bitmap, bitmap.width, bitmap.height);
  } catch {
    return null;
  }
};

export { mapPreviewFromZip, thumbnailFromImage };

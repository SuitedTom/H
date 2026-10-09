import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { Pose17 } from './types';
import { computeForwardKinematics17 } from './forwardKinematics';
import { PHYSICS_CONFIG } from './config';

/**
 * Basic CRC32 table and calculation for PNG chunks.
 */
let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(buf: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  const dv = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);

  dv.setUint32(0, len, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcTarget = chunk.subarray(4, 8 + len);
  dv.setUint32(8 + len, crc32(crcTarget), false);

  return chunk;
}

/**
 * Encodes an RGBA pixel buffer into a PNG file.
 */
export function encodeRgbaToPng(
  width: number,
  height: number,
  rgba: Uint8Array
): Uint8Array {
  // Signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  const ihdrDv = new DataView(ihdr.buffer);
  ihdrDv.setUint32(0, width, false);
  ihdrDv.setUint32(4, height, false);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with row filter byte (0)
  const rawData = new Uint8Array(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;

  for (let y = 0; y < height; y++) {
    rawData[dstOffset++] = 0; // No filter
    const rowLen = width * 4;
    rawData.set(rgba.subarray(srcOffset, srcOffset + rowLen), dstOffset);
    srcOffset += rowLen;
    dstOffset += rowLen;
  }

  const compressedData = zlib.deflateSync(rawData);
  const ihdrChunk = makePngChunk('IHDR', ihdr);
  const idatChunk = makePngChunk('IDAT', compressedData);
  const iendChunk = makePngChunk('IEND', new Uint8Array(0));

  const totalLen =
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLen);
  let cursor = 0;

  png.set(signature, cursor);
  cursor += signature.length;
  png.set(ihdrChunk, cursor);
  cursor += ihdrChunk.length;
  png.set(idatChunk, cursor);
  cursor += idatChunk.length;
  png.set(iendChunk, cursor);

  return png;
}

/**
 * Simple 2D software canvas for rasterizing preview frames.
 */
export class SoftwareCanvas {
  width: number;
  height: number;
  pixels: Uint8Array; // RGBA

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    this.clear(248, 250, 252, 255); // #F8FAFC
  }

  clear(r: number, g: number, b: number, a = 255) {
    for (let i = 0; i < this.pixels.length; i += 4) {
      this.pixels[i] = r;
      this.pixels[i + 1] = g;
      this.pixels[i + 2] = b;
      this.pixels[i + 3] = a;
    }
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const idx = (iy * this.width + ix) * 4;
    // Simple alpha blending
    if (a === 255) {
      this.pixels[idx] = r;
      this.pixels[idx + 1] = g;
      this.pixels[idx + 2] = b;
      this.pixels[idx + 3] = 255;
    } else {
      const alpha = a / 255;
      this.pixels[idx] = Math.round(this.pixels[idx] * (1 - alpha) + r * alpha);
      this.pixels[idx + 1] = Math.round(
        this.pixels[idx + 1] * (1 - alpha) + g * alpha
      );
      this.pixels[idx + 2] = Math.round(
        this.pixels[idx + 2] * (1 - alpha) + b * alpha
      );
      this.pixels[idx + 3] = 255;
    }
  }

  drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number,
    r: number,
    g: number,
    b: number
  ) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const steps = Math.ceil(len * 2);
    const rad = Math.max(0.5, thickness * 0.5);

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      for (let rx = -rad; rx <= rad; rx++) {
        for (let ry = -rad; ry <= rad; ry++) {
          if (rx * rx + ry * ry <= rad * rad) {
            this.setPixel(cx + rx, cy + ry, r, g, b);
          }
        }
      }
    }
  }

  drawCircle(
    cx: number,
    cy: number,
    radius: number,
    r: number,
    g: number,
    b: number,
    fill = true
  ) {
    const rInt = Math.ceil(radius);
    for (let y = -rInt; y <= rInt; y++) {
      for (let x = -rInt; x <= rInt; x++) {
        const d2 = x * x + y * y;
        if (fill) {
          if (d2 <= radius * radius) {
            this.setPixel(cx + x, cy + y, r, g, b);
          }
        } else {
          if (Math.abs(Math.sqrt(d2) - radius) < 1.0) {
            this.setPixel(cx + x, cy + y, r, g, b);
          }
        }
      }
    }
  }

  drawStickfigure(
    pose: Pose17,
    offsetX = 0,
    offsetY = 0,
    scaleFactor = 1.0,
    colorR = 15,
    colorG = 23,
    colorB = 42
  ) {
    const joints = computeForwardKinematics17(pose);
    const { boneThickness } = PHYSICS_CONFIG.skeleton;

    // Draw bones
    for (let i = 1; i < 17; i++) {
      if (i === 13) continue; // Head is drawn as circle
      const j = joints[i];
      const sx = offsetX + j.startX * scaleFactor;
      const sy = offsetY + j.startY * scaleFactor;
      const ex = offsetX + j.endX * scaleFactor;
      const ey = offsetY + j.endY * scaleFactor;
      const thick = Math.max(1, (boneThickness[i] * 0.1) * scaleFactor);

      this.drawLine(sx, sy, ex, ey, thick, colorR, colorG, colorB);
    }

    // Draw head (Node 13)
    const head = joints[13];
    const headX = offsetX + head.endX * scaleFactor;
    const headY = offsetY + head.endY * scaleFactor;
    const headRadius = Math.max(2, (head.length * 0.45) * scaleFactor);
    this.drawCircle(headX, headY, headRadius, colorR, colorG, colorB, true);
  }

  drawGround(groundY: number, offsetY = 0, scaleFactor = 1.0) {
    const gy = offsetY + groundY * scaleFactor;
    this.drawLine(0, gy, this.width, gy, 1, 148, 163, 184); // #94A3B8
  }
}

/**
 * Renders a contact sheet PNG containing a grid of evenly sampled frames.
 */
export function renderContactSheetPng(
  frames: Pose17[],
  options: {
    columns?: number;
    rows?: number;
    cellWidth?: number;
    cellHeight?: number;
    groundY?: number;
  } = {}
): Uint8Array {
  const cols = options.columns ?? 4;
  const rows = options.rows ?? 3;
  const cellW = options.cellWidth ?? 200;
  const cellH = options.cellHeight ?? 180;
  const groundY = options.groundY ?? PHYSICS_CONFIG.environment.defaultGroundY;

  const totalCells = cols * rows;
  const canvasW = cols * cellW;
  const canvasH = rows * cellH;
  const canvas = new SoftwareCanvas(canvasW, canvasH);

  const n = frames.length;
  if (n === 0) return encodeRgbaToPng(canvasW, canvasH, canvas.pixels);

  // Sample frames across sequence
  const sampleIndices: number[] = [];
  for (let i = 0; i < totalCells; i++) {
    const idx = Math.min(n - 1, Math.round((i / (totalCells - 1)) * (n - 1)));
    sampleIndices.push(idx);
  }

  // Find bounding box for scaling
  let minX = Infinity;
  let maxX = -Infinity;
  for (const pose of frames) {
    if (pose.rootX < minX) minX = pose.rootX;
    if (pose.rootX > maxX) maxX = pose.rootX;
  }
  const midX = (minX + maxX) * 0.5;

  const scaleFactor = 0.22;

  for (let i = 0; i < totalCells; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * cellW;
    const cellY = row * cellH;
    const frameIdx = sampleIndices[i];
    const pose = frames[frameIdx];

    // Grid divider borders
    canvas.drawLine(cellX, cellY, cellX + cellW, cellY, 1, 226, 232, 240);
    canvas.drawLine(cellX, cellY, cellX, cellY + cellH, 1, 226, 232, 240);

    // Ground line inside cell
    const cellGroundOffsetY = cellY + cellH - 30 - groundY * scaleFactor;
    const cellCenterOffsetX = cellX + cellW * 0.5 - midX * scaleFactor;

    canvas.drawGround(groundY, cellGroundOffsetY, scaleFactor);

    // Draw stickfigure in cell
    canvas.drawStickfigure(
      pose,
      cellCenterOffsetX,
      cellGroundOffsetY,
      scaleFactor,
      15,
      23,
      42
    );
  }

  return encodeRgbaToPng(canvasW, canvasH, canvas.pixels);
}

/**
 * Pure TypeScript animated GIF encoder (GIF89a).
 */
export function encodeFramesToGif(
  frames: Pose17[],
  options: {
    width?: number;
    height?: number;
    fps?: number;
    groundY?: number;
  } = {}
): Uint8Array {
  const width = options.width ?? 320;
  const height = options.height ?? 240;
  const fps = options.fps ?? 24;
  const groundY = options.groundY ?? PHYSICS_CONFIG.environment.defaultGroundY;
  const delayHundredths = Math.max(2, Math.round(100 / fps));

  // Find camera/root bounds
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of frames) {
    if (p.rootX < minX) minX = p.rootX;
    if (p.rootX > maxX) maxX = p.rootX;
  }
  const midX = (minX + maxX) * 0.5;
  const scale = 0.28;

  // 16-color palette
  // 0: background (#F8FAFC)
  // 1: stickfigure dark (#0F172A)
  // 2: ground line (#94A3B8)
  // 3: accent blue (#0284C7)
  const palette = [
    248, 250, 252, // 0: bg
    15, 23, 42,    // 1: stick
    148, 163, 184, // 2: ground
    2, 132, 199,   // 3: blue
  ];
  while (palette.length < 256 * 3) {
    palette.push(0);
  }

  const out: number[] = [];

  // Write ASCII string helper
  const writeStr = (str: string) => {
    for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i));
  };
  const write16 = (val: number) => {
    out.push(val & 0xff);
    out.push((val >> 8) & 0xff);
  };

  // Header
  writeStr('GIF89a');

  // Logical Screen Descriptor
  write16(width);
  write16(height);
  out.push(0xf7); // Global color table, 8 bits/pixel (256 colors)
  out.push(0);    // Background color index 0
  out.push(0);    // Aspect ratio

  // Global Color Table
  for (let i = 0; i < 256 * 3; i++) {
    out.push(palette[i]);
  }

  // Netscape 2.0 Loop Block
  out.push(0x21); // Extension
  out.push(0xff); // Application extension
  out.push(11);
  writeStr('NETSCAPE2.0');
  out.push(3);
  out.push(1);
  write16(0);     // Loop forever
  out.push(0);    // Block terminator

  // Encode each frame
  const canvas = new SoftwareCanvas(width, height);
  const offsetX = width * 0.5 - midX * scale;
  const offsetY = height - 35 - groundY * scale;

  for (let f = 0; f < frames.length; f++) {
    canvas.clear(248, 250, 252, 255);
    canvas.drawGround(groundY, offsetY, scale);
    canvas.drawStickfigure(frames[f], offsetX, offsetY, scale, 15, 23, 42);

    // Graphic Control Extension
    out.push(0x21); // Extension
    out.push(0xf9); // Graphic Control
    out.push(4);    // Byte size
    out.push(0x04); // Disposal method (clear to background)
    write16(delayHundredths);
    out.push(0);    // Transparent color index
    out.push(0);    // Block terminator

    // Image Descriptor
    out.push(0x2c); // Image separator
    write16(0);     // Left
    write16(0);     // Top
    write16(width);
    write16(height);
    out.push(0);    // No local color table

    // Map canvas RGBA pixels to palette indices (0, 1, 2)
    const indexedPixels = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      const r = canvas.pixels[p * 4];
      const g = canvas.pixels[p * 4 + 1];
      const b = canvas.pixels[p * 4 + 2];
      if (r < 50 && g < 50 && b < 50) {
        indexedPixels[p] = 1; // Stickfigure
      } else if (Math.abs(r - 148) < 15 && Math.abs(g - 163) < 15) {
        indexedPixels[p] = 2; // Ground line
      } else {
        indexedPixels[p] = 0; // Background
      }
    }

    // Write LZW raster data
    // Minimal sub-block LZW: LZW min code size = 8
    const minCodeSize = 8;
    out.push(minCodeSize);

    // Simple uncompressed/flat LZW streaming
    const clearCode = 1 << minCodeSize; // 256
    const eoiCode = clearCode + 1;       // 257

    // Stream LZW tokens in sub-blocks of up to 255 bytes
    const lzwBytes: number[] = [];
    let curBit = 0;
    let curByte = 0;
    let curCodeSize = minCodeSize + 1; // 9 bits

    const writeBits = (code: number, size: number) => {
      for (let b = 0; b < size; b++) {
        if ((code >> b) & 1) {
          curByte |= 1 << curBit;
        }
        curBit++;
        if (curBit === 8) {
          lzwBytes.push(curByte);
          curByte = 0;
          curBit = 0;
        }
      }
    };

    writeBits(clearCode, curCodeSize);

    // Write literal pixels with periodically resetting clear code
    let nextCode = eoiCode + 1;
    for (let i = 0; i < indexedPixels.length; i++) {
      writeBits(indexedPixels[i], curCodeSize);
      nextCode++;
      if (nextCode >= (1 << curCodeSize) && curCodeSize < 12) {
        curCodeSize++;
      } else if (nextCode >= 4094) {
        writeBits(clearCode, curCodeSize);
        curCodeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }
    }

    writeBits(eoiCode, curCodeSize);
    if (curBit > 0) {
      lzwBytes.push(curByte);
    }

    // Write LZW sub-blocks (max 255 bytes per sub-block)
    let src = 0;
    while (src < lzwBytes.length) {
      const blockSize = Math.min(255, lzwBytes.length - src);
      out.push(blockSize);
      for (let b = 0; b < blockSize; b++) {
        out.push(lzwBytes[src + b]);
      }
      src += blockSize;
    }
    out.push(0); // Block terminator
  }

  // GIF Trailer
  out.push(0x3b);

  return new Uint8Array(out);
}

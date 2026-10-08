import { DrunkenGeneratorConfig } from './drunkenTypes';
import { STKNDS_PREFIX, gzipBytes, hexColorToArgbUint32 } from '../stknds/stkndsCore';
import { STICKFIGURE_PARENTS, STICKFIGURE_BONE_LENGTHS, STICKFIGURE_BONE_THICKNESS } from '../stknds/stickfigureStructure';
import { buildCanonicalDrunkenBoxingFrames } from './drunkenGenerator';

export async function synthesizeDrunkenBoxingStknds(
  baseDecompressed27: Uint8Array,
  config: Partial<DrunkenGeneratorConfig> = {}
): Promise<Uint8Array> {
  const framesSpec = buildCanonicalDrunkenBoxingFrames(config);
  const nFrames = framesSpec.length;

  const prefixHdr = baseDecompressed27.slice(0, 2591);
  const fhdrTmpl = baseDecompressed27.slice(2591, 2649);
  const instTmpl = baseDecompressed27.slice(2649, 3740);
  const fftrTmpl = baseDecompressed27.slice(3740, 3788);
  const ptrlTmpl = baseDecompressed27.slice(34910, 34954);

  const baseDv = new DataView(
    baseDecompressed27.buffer,
    baseDecompressed27.byteOffset,
    baseDecompressed27.byteLength
  );
  const defA2: number[] = [];
  const defA3: number[] = [];
  for (let i = 0; i < 17; i++) {
    const off = 1231 + i * 84;
    defA2.push(baseDv.getFloat32(off + 28, false));
    defA3.push(baseDv.getFloat32(off + 32, false));
  }

  const manColorHex = config.manColorHex ?? '#0F172A';
  const manArgb = hexColorToArgbUint32(manColorHex);
  const targetFps = config.targetFps ?? 24;

  let totalBytes = prefixHdr.length + ptrlTmpl.length;
  for (let f = 0; f < nFrames; f++) {
    totalBytes += fhdrTmpl.length + instTmpl.length + fftrTmpl.length;
  }

  const buf = new Uint8Array(totalBytes);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  buf.set(prefixHdr, 0);
  buf[30] = targetFps;
  dv.setInt32(2587, nFrames, false);

  let cursor = prefixHdr.length;

  const writeManInstance = (sx: number, sy: number, wAngles: number[]) => {
    buf.set(instTmpl, cursor);
    dv.setInt32(cursor + 0, 0, false);
    dv.setInt32(cursor + 4, 1, false);
    dv.setInt32(cursor + 8, 1, false);
    dv.setFloat32(cursor + 71, 0.5, false); // Instance scale 0.5x
    dv.setFloat32(cursor + 75, sx, false);
    dv.setFloat32(cursor + 79, sy, false);
    dv.setUint32(cursor + 83, manArgb, false);

    for (let i = 0; i < 17; i++) {
      const rOff = cursor + 112 + i * 58;
      const p = STICKFIGURE_PARENTS[i];
      const relA1 = p === -1 ? wAngles[i] : wAngles[i] - wAngles[p];

      dv.setFloat32(rOff + 0, 1.0, false);
      dv.setFloat32(rOff + 4, STICKFIGURE_BONE_LENGTHS[i], false);
      dv.setInt32(rOff + 8, STICKFIGURE_BONE_THICKNESS[i], false);
      dv.setFloat32(rOff + 12, relA1, false);
      dv.setFloat32(rOff + 16, defA2[i], false);
      dv.setFloat32(rOff + 20, defA3[i], false);
      dv.setUint32(rOff + 24, manArgb, false);
    }
    cursor += instTmpl.length;
  };

  for (let f = 0; f < nFrames; f++) {
    const spec = framesSpec[f];
    buf.set(fhdrTmpl, cursor);
    dv.setFloat32(cursor + 42, spec.camZoom ?? 1.0, false);
    dv.setFloat32(cursor + 46, spec.camX ?? 0.0, false);
    dv.setFloat32(cursor + 50, spec.camY ?? 0.0, false);
    dv.setInt32(cursor + 54, 1, false); // 1 Figure instance per frame
    cursor += fhdrTmpl.length;

    writeManInstance(spec.sceneX, spec.sceneY, spec.worldAngles);

    buf.set(fftrTmpl, cursor);
    cursor += fftrTmpl.length;
  }

  buf.set(ptrlTmpl, cursor);

  const compressedPayload = await gzipBytes(buf);
  const finalStknds = new Uint8Array(STKNDS_PREFIX.length + compressedPayload.length);
  finalStknds.set(STKNDS_PREFIX, 0);
  finalStknds.set(compressedPayload, STKNDS_PREFIX.length);
  return finalStknds;
}

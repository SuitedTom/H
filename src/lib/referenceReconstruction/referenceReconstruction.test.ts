import { CANONICAL_115_REFERENCE_FRAMES, buildAdjustedReferenceReconstructionFrames } from './referenceReconstructionGenerator';

export function runReferenceReconstructionTests() {
  if (CANONICAL_115_REFERENCE_FRAMES.length !== 115) {
    throw new Error(`Expected 115 frames, got ${CANONICAL_115_REFERENCE_FRAMES.length}`);
  }

  CANONICAL_115_REFERENCE_FRAMES.forEach((frame, idx) => {
    if (frame.frame !== idx) {
      throw new Error(`Frame index mismatch at ${idx}: ${frame.frame}`);
    }
  });

  const frames = buildAdjustedReferenceReconstructionFrames({
    projectName: 'test',
    targetFps: 25,
    primaryColorHex: '#000000',
    accentColorHex: '#FF0000',
    enableOverlayFx: true,
  });

  if (frames.length !== 115) {
    throw new Error(`Expected 115 adjusted frames, got ${frames.length}`);
  }
}

runReferenceReconstructionTests();

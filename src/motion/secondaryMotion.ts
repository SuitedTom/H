import { Pose17 } from './types';
import { interpolateAngleDeg } from './easing';

/**
 * Applies kinetic chain follow-through by introducing progressive phase lag down parent-child chains.
 * Distal segments (forearm, hand, shin, head) lag proximal drivers (chest, thigh, neck) by 1-2 frames.
 */
export function applyFollowThroughLag(frames: Pose17[]): Pose17[] {
  const n = frames.length;
  if (n <= 2) return frames;

  const result: Pose17[] = frames.map((f) => ({
    ...f,
    angles: [...f.angles],
  }));

  // Chain lag configurations: [distalBoneIndex, lagFrames, blendWeight]
  const lagRules: [number, number, number][] = [
    [8, 1, 0.35],  // Upper chest lags lower spine
    [10, 1, 0.45], // Right forearm lags bicep
    [11, 2, 0.55], // Right hand lags forearm
    [12, 1, 0.30], // Neck lags chest
    [13, 2, 0.45], // Head lags neck
    [15, 1, 0.45], // Left forearm lags bicep
    [16, 2, 0.55], // Left hand lags forearm
  ];

  for (let f = 1; f < n; f++) {
    for (const [boneIdx, lagFrames, weight] of lagRules) {
      const sourceFrame = Math.max(0, f - lagFrames);
      const delayedAngle = frames[sourceFrame].angles[boneIdx];
      const currentAngle = result[f].angles[boneIdx];
      result[f].angles[boneIdx] = interpolateAngleDeg(currentAngle, delayedAngle, weight);
    }
  }

  return result;
}

/**
 * Applies moving-hold breathing and micro-variation to avoid static freeze.
 * Modulates chest and neck angles with subtle harmonic oscillation.
 */
export function applyMovingHoldBreathing(
  frames: Pose17[],
  startFrame: number,
  endFrame: number,
  intensity = 1.0
): Pose17[] {
  const n = frames.length;
  const start = Math.max(0, startFrame);
  const end = Math.min(n - 1, endFrame);

  for (let f = start; f <= end; f++) {
    const elapsed = f - start;
    // Rhythmic respiration cycle ~ 12-16 frames per breath
    const breathPhase = (elapsed / 16) * Math.PI * 2;
    const chestDelta = Math.sin(breathPhase) * 1.2 * intensity;
    const neckDelta = Math.sin(breathPhase + 0.5) * 0.8 * intensity;
    const pelvisYDelta = Math.sin(breathPhase) * 0.6 * intensity;

    frames[f].angles[8] += chestDelta;  // Upper chest
    frames[f].angles[12] -= neckDelta; // Neck compensation keeps head upright
    frames[f].rootY += pelvisYDelta;    // Pelvic vertical micro-heave
  }

  return frames;
}

/**
 * Applies subtle anatomical asymmetry between left and right limb angles.
 * Eliminates robotic "twinning".
 */
export function applyNaturalAsymmetry(pose: Pose17, offsetDeg = 4.0): Pose17 {
  const result: Pose17 = {
    ...pose,
    angles: [...pose.angles],
  };

  // Slightly offset left arm and left leg relative to right side
  result.angles[4] += offsetDeg * 0.5; // Left thigh
  result.angles[5] -= offsetDeg * 0.4; // Left shin
  result.angles[14] -= offsetDeg;      // Left bicep
  result.angles[15] += offsetDeg * 0.8;// Left forearm

  return result;
}

/**
 * Modulates stride/cycle properties so repetitive loops don't look mechanical.
 */
export function applyPerCycleVariation(
  frames: Pose17[],
  stridePeriod = 12
): Pose17[] {
  return frames.map((pose, idx) => {
    const cycle = Math.floor(idx / stridePeriod);
    const pseudoRandomMod = Math.sin(cycle * 3.7) * 1.5;
    const updated = { ...pose, angles: [...pose.angles] };
    updated.angles[1] += pseudoRandomMod;
    updated.angles[4] -= pseudoRandomMod * 0.8;
    return updated;
  });
}

/**
 * Downsamples motion to animate "on twos" at 24 fps (each pose held for 2 frames).
 * Gives classic hand-drawn snappiness while preserving timing.
 */
export function applyAnimateOnTwos(frames: Pose17[]): Pose17[] {
  const result: Pose17[] = [];
  for (let i = 0; i < frames.length; i++) {
    const sourceIdx = Math.floor(i / 2) * 2;
    result.push({
      ...frames[sourceIdx],
      angles: [...frames[sourceIdx].angles],
    });
  }
  return result;
}

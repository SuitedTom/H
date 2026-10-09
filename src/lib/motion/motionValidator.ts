import { STICKFIGURE_BONE_LENGTHS } from '../stknds/stickfigureStructure';
import { solveForwardKinematics17 } from '../skills/kinematicsSolvers';
import type { MotionFrame } from './proceduralMotion';
import { normalizeAngleDeltaDeg } from './proceduralMotion';

export interface MotionValidationOptions {
  scale?: number;
  /** Maximum allowed bone-length error in pixels, scaled to the current instance. */
  boneLengthTolerancePx?: number;
  /** Maximum allowed per-frame joint-angle change before warning. */
  maxAngularStepDeg?: number;
  /** Maximum allowed root displacement per frame before warning. */
  maxRootStepPx?: number;
  /** Maximum drift of a foot marked planted in both adjacent frames. */
  maxPlantedFootDriftPx?: number;
}

export interface MotionValidationReport {
  passed: boolean;
  frameCount: number;
  metrics: {
    maxBoneLengthErrorPx: number;
    maxAngularStepDeg: number;
    maxRootStepPx: number;
    maxPlantedFootDriftPx: number;
    nonFiniteValues: number;
  };
  diagnostics: string[];
}

/**
 * General-purpose structural and temporal checks for any generated frame sequence.
 * This is a diagnostic gate, not a complete physical truth model.
 */
export function validateMotionFrames(
  frames: MotionFrame[],
  options: MotionValidationOptions = {},
): MotionValidationReport {
  const scale = options.scale ?? 0.5;
  const boneTolerance = options.boneLengthTolerancePx ?? Math.max(0.05, 0.1 * scale);
  const maxAngularAllowed = options.maxAngularStepDeg ?? 35;
  const maxRootAllowed = options.maxRootStepPx ?? 50;
  const maxFootDriftAllowed = options.maxPlantedFootDriftPx ?? 1;

  const metrics = {
    maxBoneLengthErrorPx: 0,
    maxAngularStepDeg: 0,
    maxRootStepPx: 0,
    maxPlantedFootDriftPx: 0,
    nonFiniteValues: 0,
  };
  const diagnostics: string[] = [];

  if (!Number.isFinite(scale) || scale <= 0) diagnostics.push('Scale must be a finite positive number.');
  if (frames.length === 0) diagnostics.push('No motion frames supplied.');
  if (![boneTolerance, maxAngularAllowed, maxRootAllowed, maxFootDriftAllowed].every((v) => Number.isFinite(v) && v >= 0)) {
    diagnostics.push('Validation thresholds must be finite non-negative numbers.');
  }

  let previousFrame: MotionFrame | undefined;
  let previousJoints: ReturnType<typeof solveForwardKinematics17> | undefined;

  for (const frame of frames) {
    if (!Number.isFinite(frame.frame) || !Number.isFinite(frame.rootX) || !Number.isFinite(frame.rootY)) {
      metrics.nonFiniteValues += 1;
      diagnostics.push(`Frame ${frame.frame}: invalid frame/root coordinate.`);
      previousFrame = frame;
      previousJoints = undefined;
      continue;
    }
    if (frame.angles.length !== 17 || frame.angles.some((angle) => !Number.isFinite(angle))) {
      metrics.nonFiniteValues += 1;
      diagnostics.push(`Frame ${frame.frame}: expected 17 finite joint angles.`);
      previousFrame = frame;
      previousJoints = undefined;
      continue;
    }
    if (previousFrame && frame.frame <= previousFrame.frame) {
      diagnostics.push(`Frame order is not strictly increasing at frame ${frame.frame}.`);
    }

    const joints = solveForwardKinematics17(frame.rootX, frame.rootY, frame.angles, scale);
    for (let jointIndex = 1; jointIndex < joints.length; jointIndex += 1) {
      const joint = joints[jointIndex];
      const actualLength = Math.hypot(joint.endX - joint.startX, joint.endY - joint.startY);
      const expectedLength = STICKFIGURE_BONE_LENGTHS[jointIndex] * scale;
      metrics.maxBoneLengthErrorPx = Math.max(metrics.maxBoneLengthErrorPx, Math.abs(actualLength - expectedLength));
    }

    if (previousFrame && previousJoints && frame.frame === previousFrame.frame + 1) {
      const rootStep = Math.hypot(frame.rootX - previousFrame.rootX, frame.rootY - previousFrame.rootY);
      metrics.maxRootStepPx = Math.max(metrics.maxRootStepPx, rootStep);
      for (let i = 0; i < 17; i += 1) {
        metrics.maxAngularStepDeg = Math.max(
          metrics.maxAngularStepDeg,
          Math.abs(normalizeAngleDeltaDeg(frame.angles[i] - previousFrame.angles[i])),
        );
      }

      for (const footIndex of [3, 6]) {
        const wasPlanted = previousFrame.plantedFootIndices.includes(footIndex);
        const isPlanted = frame.plantedFootIndices.includes(footIndex);
        if (wasPlanted && isPlanted) {
          const drift = Math.hypot(
            joints[footIndex].endX - previousJoints[footIndex].endX,
            joints[footIndex].endY - previousJoints[footIndex].endY,
          );
          metrics.maxPlantedFootDriftPx = Math.max(metrics.maxPlantedFootDriftPx, drift);
        }
      }
    }

    if (joints.some((joint) =>
      ![joint.startX, joint.startY, joint.endX, joint.endY, joint.worldAngle, joint.relAngle].every(Number.isFinite)
    )) {
      metrics.nonFiniteValues += 1;
      diagnostics.push(`Frame ${frame.frame}: forward kinematics produced non-finite coordinates.`);
    }

    previousFrame = frame;
    previousJoints = joints;
  }

  if (metrics.maxBoneLengthErrorPx > boneTolerance) {
    diagnostics.push(`Bone-length drift ${metrics.maxBoneLengthErrorPx.toFixed(4)}px exceeds tolerance ${boneTolerance.toFixed(4)}px.`);
  }
  if (metrics.maxAngularStepDeg > maxAngularAllowed) {
    diagnostics.push(`Angular step ${metrics.maxAngularStepDeg.toFixed(2)}° exceeds threshold ${maxAngularAllowed.toFixed(2)}°/frame.`);
  }
  if (metrics.maxRootStepPx > maxRootAllowed) {
    diagnostics.push(`Root step ${metrics.maxRootStepPx.toFixed(2)}px exceeds threshold ${maxRootAllowed.toFixed(2)}px/frame.`);
  }
  if (metrics.maxPlantedFootDriftPx > maxFootDriftAllowed) {
    diagnostics.push(`Planted-foot drift ${metrics.maxPlantedFootDriftPx.toFixed(2)}px exceeds threshold ${maxFootDriftAllowed.toFixed(2)}px/frame.`);
  }

  const passed = diagnostics.length === 0
    && metrics.nonFiniteValues === 0
    && metrics.maxBoneLengthErrorPx <= boneTolerance
    && metrics.maxAngularStepDeg <= maxAngularAllowed
    && metrics.maxRootStepPx <= maxRootAllowed
    && metrics.maxPlantedFootDriftPx <= maxFootDriftAllowed;

  return { passed, frameCount: frames.length, metrics, diagnostics };
}

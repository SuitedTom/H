import { solveForwardKinematics17, type JointWorldPose } from '../skills/kinematicsSolvers';

export type MotionEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'hold';

export interface SparseMotionKeyframe {
  /** Zero-based frame index. Must be finite and strictly increasing. */
  frame: number;
  rootX: number;
  rootY: number;
  /** World-space angles in Stick Nodes' 17-bone order. */
  angles: number[];
  /** Easing used from this keyframe toward the next keyframe. */
  easingToNext?: MotionEasing;
  /** Semantic label for review and diagnostics. */
  phase?: string;
  /** Foot segment indices held in world space during this keyframe interval. */
  plantedFootIndices?: number[];
}

export interface MotionFrame {
  frame: number;
  rootX: number;
  rootY: number;
  angles: number[];
  phase: string;
  plantedFootIndices: number[];
}

export interface GenerateMotionOptions {
  /** Inclusive last frame. Defaults to the last keyframe frame. */
  endFrame?: number;
  /** Instance scale passed to the existing Stick Nodes FK solver. */
  scale?: number;
}

const JOINT_COUNT = 17;
const FOOT_SEGMENT_INDICES = new Set([3, 6]);

function assertKeyframe(keyframe: SparseMotionKeyframe, index: number): void {
  if (!Number.isFinite(keyframe.frame) || !Number.isInteger(keyframe.frame) || keyframe.frame < 0) {
    throw new Error(`Keyframe ${index} has invalid frame index: ${keyframe.frame}`);
  }
  if (!Number.isFinite(keyframe.rootX) || !Number.isFinite(keyframe.rootY)) {
    throw new Error(`Keyframe ${index} has a non-finite root position.`);
  }
  if (keyframe.angles.length !== JOINT_COUNT) {
    throw new Error(`Keyframe ${index} must contain exactly ${JOINT_COUNT} joint angles.`);
  }
  if (keyframe.angles.some((angle) => !Number.isFinite(angle))) {
    throw new Error(`Keyframe ${index} contains a non-finite joint angle.`);
  }
  for (const footIndex of keyframe.plantedFootIndices ?? []) {
    if (!FOOT_SEGMENT_INDICES.has(footIndex)) {
      throw new Error(`Keyframe ${index} uses unsupported planted foot segment index ${footIndex}; expected 3 or 6.`);
    }
  }
}

export function normalizeAngleDeltaDeg(delta: number): number {
  const wrapped = ((delta + 180) % 360 + 360) % 360 - 180;
  // Preserve positive 180 as positive when the input explicitly rotates that way.
  return wrapped === -180 && delta > 0 ? 180 : wrapped;
}

export function easeMotion(t: number, easing: MotionEasing = 'linear'): number {
  const u = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'easeIn':
      return u * u;
    case 'easeOut':
      return 1 - (1 - u) * (1 - u);
    case 'easeInOut':
      return u * u * (3 - 2 * u);
    case 'hold':
      return u >= 1 ? 1 : 0;
    case 'linear':
    default:
      return u;
  }
}

function interpolateAngle(from: number, to: number, t: number): number {
  return from + normalizeAngleDeltaDeg(to - from) * t;
}

/**
 * Expands sparse, high-level pose keys into deterministic full-frame world poses.
 * Uses the repository's existing 17-bone FK convention and does not mutate inputs.
 */
export function generateFramesFromKeyframes(
  input: SparseMotionKeyframe[],
  options: GenerateMotionOptions = {},
): MotionFrame[] {
  if (input.length === 0) throw new Error('At least one keyframe is required.');

  const keyframes = input.map((keyframe) => ({
    ...keyframe,
    angles: [...keyframe.angles],
    plantedFootIndices: [...(keyframe.plantedFootIndices ?? [])],
  }));
  keyframes.forEach(assertKeyframe);

  for (let i = 1; i < keyframes.length; i += 1) {
    if (keyframes[i].frame <= keyframes[i - 1].frame) {
      throw new Error('Keyframes must be provided in strictly increasing frame order.');
    }
  }

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  const endFrame = options.endFrame ?? last.frame;
  const scale = options.scale ?? 0.5;

  if (!Number.isInteger(endFrame) || endFrame < last.frame || endFrame < first.frame) {
    throw new Error('endFrame must be an integer at or after the last keyframe.');
  }
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('scale must be a finite positive number.');

  const frames: MotionFrame[] = [];
  let segmentIndex = 0;

  for (let frame = first.frame; frame <= endFrame; frame += 1) {
    while (segmentIndex < keyframes.length - 2 && frame >= keyframes[segmentIndex + 1].frame) {
      segmentIndex += 1;
    }

    const a = keyframes[segmentIndex];
    const b = keyframes[Math.min(segmentIndex + 1, keyframes.length - 1)];
    const span = b.frame - a.frame;
    const rawT = span === 0 ? 0 : Math.max(0, Math.min(1, (frame - a.frame) / span));
    const t = easeMotion(rawT, a.easingToNext ?? 'linear');

    const isAfterLastKey = frame >= last.frame;
    const angles = isAfterLastKey
      ? [...last.angles]
      : a.angles.map((angle, jointIndex) => interpolateAngle(angle, b.angles[jointIndex], t));

    frames.push({
      frame,
      rootX: isAfterLastKey ? last.rootX : a.rootX + (b.rootX - a.rootX) * t,
      rootY: isAfterLastKey ? last.rootY : a.rootY + (b.rootY - a.rootY) * t,
      angles,
      phase: isAfterLastKey ? (last.phase ?? a.phase ?? 'unspecified') : (a.phase ?? 'unspecified'),
      plantedFootIndices: [...(isAfterLastKey ? last.plantedFootIndices ?? [] : a.plantedFootIndices ?? [])],
    });
  }

  // FK is deliberately run here as a structural guard: malformed angle arrays or
  // unexpected non-finite world coordinates should fail at generation, not export.
  for (const frame of frames) {
    const joints = solveForwardKinematics17(frame.rootX, frame.rootY, frame.angles, scale);
    if (joints.length !== JOINT_COUNT || joints.some((joint) =>
      ![joint.startX, joint.startY, joint.endX, joint.endY, joint.worldAngle].every(Number.isFinite)
    )) {
      throw new Error(`Forward kinematics produced an invalid pose at frame ${frame.frame}.`);
    }
  }

  return frames;
}

/** Derive connected segment geometry from a generated frame for renderers/auditors. */
export function getWorldJointPoses(frame: MotionFrame, scale = 0.5): JointWorldPose[] {
  return solveForwardKinematics17(frame.rootX, frame.rootY, frame.angles, scale);
}

/**
 * Anatomical constraints for the repository's canonical Stick Nodes 17-bone layout.
 *
 * Canonical order:
 * 0 pelvis, 1-3 right leg, 4-6 left leg, 7 lower spine, 8 upper chest,
 * 9-11 right arm, 12 neck, 13 head, 14-16 left arm.
 *
 * A 2D projected angle alone cannot determine one universal signed knee/elbow
 * bend for every side, facing direction and stylized pose. These limits constrain
 * plausible relative-angle ranges; action-aware evaluation handles posture intent.
 */
export const ANATOMICAL_JOINT_INDEX = {
  pelvis: 0, rightThigh: 1, rightShin: 2, rightFoot: 3,
  leftThigh: 4, leftShin: 5, leftFoot: 6,
  lowerSpine: 7, upperChest: 8,
  rightBicep: 9, rightForearm: 10, rightHand: 11,
  neck: 12, head: 13,
  leftBicep: 14, leftForearm: 15, leftHand: 16,
} as const;

export const ANATOMICAL_JOINT_NAMES = [
  "Pelvis", "Right Thigh", "Right Shin", "Right Foot",
  "Left Thigh", "Left Shin", "Left Foot", "Lower Spine",
  "Upper Chest", "Right Bicep", "Right Forearm", "Right Hand",
  "Neck", "Head", "Left Bicep", "Left Forearm", "Left Hand",
] as const;

export interface JointConstraintRule {
  jointIndex: number;
  jointName: string;
  minRelAngleDeg: number;
  maxRelAngleDeg: number;
  description: string;
}
export interface JointLimit { minRel: number; maxRel: number; }

function wrapSignedDegrees(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

/** Relative-angle limits use the true 17-node hierarchy. */
export function getAnatomicalJointLimits(_isRightFacing: boolean): Record<number, JointLimit> {
  return {
    2: { minRel: -145, maxRel: 145 }, // Right knee hinge
    5: { minRel: -145, maxRel: 145 }, // Left knee hinge
    10: { minRel: -155, maxRel: 155 }, // Right elbow, not head
    15: { minRel: -155, maxRel: 155 }, // Left elbow, not neck
    7: { minRel: 40, maxRel: 140 },    // Lower spine: ~90° is upright
    8: { minRel: -50, maxRel: 50 },    // Upper chest relative to lower spine
    12: { minRel: -45, maxRel: 45 },   // Neck relative to upper chest
    13: { minRel: -40, maxRel: 40 },   // Head relative to neck
  };
}

/**
 * Returns a corrected copy and diagnostics. Non-finite values are repaired
 * deterministically so they cannot propagate NaN through forward kinematics.
 */
export function enforceAnatomicalConstraints17(
  worldAnglesDeg: number[],
  parents: number[],
  isRightFacing: boolean,
): { constrainedAngles: number[]; violationsCount: number; report: string[] } {
  if (worldAnglesDeg.length !== 17) throw new Error(`Expected 17 world angles; received ${worldAnglesDeg.length}.`);
  if (parents.length !== 17) throw new Error(`Expected 17 parent indices; received ${parents.length}.`);

  const result = [...worldAnglesDeg];
  const limits = getAnatomicalJointLimits(isRightFacing);
  let violationsCount = 0;
  const report: string[] = [];

  for (let i = 0; i < 17; i += 1) {
    const parentIdx = parents[i];
    if (!Number.isFinite(result[i])) {
      violationsCount += 1;
      const replacement = parentIdx >= 0 && Number.isFinite(result[parentIdx]) ? result[parentIdx] : 0;
      report.push(`Joint ${i} had a non-finite angle; replaced with ${replacement.toFixed(1)}°.`);
      result[i] = replacement;
    }
    const limit = limits[i];
    if (!limit || parentIdx < 0 || parentIdx >= 17) continue;
    const parentAngle = result[parentIdx];
    const relative = wrapSignedDegrees(result[i] - parentAngle);
    if (relative < limit.minRel || relative > limit.maxRel) {
      const clamped = Math.max(limit.minRel, Math.min(limit.maxRel, relative));
      violationsCount += 1;
      report.push(`Joint ${i} (${ANATOMICAL_JOINT_NAMES[i]}) relative angle ${relative.toFixed(1)}° outside [${limit.minRel}°, ${limit.maxRel}°]; clamped to ${clamped.toFixed(1)}°.`);
      result[i] = parentAngle + clamped;
    }
  }
  return { constrainedAngles: result, violationsCount, report };
}

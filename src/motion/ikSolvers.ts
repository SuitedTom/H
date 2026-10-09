import { Pose17, TwoBoneIKSolution } from './types';
import { PHYSICS_CONFIG } from './config';
import { computeForwardKinematics17 } from './forwardKinematics';

/**
 * Normalizes an angle in degrees into [-180, 180).
 */
export function normalizeDeg(deg: number): number {
  let a = deg % 360;
  if (a >= 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/**
 * Analytical Two-Bone Inverse Kinematics solver using the Law of Cosines.
 * Enforces physiological joint polarity (anti-hyperextension knee law & elbow anterior limits).
 *
 * @param rootX Starting pivot coordinate X (hip or shoulder)
 * @param rootY Starting pivot coordinate Y (hip or shoulder)
 * @param targetX Desired end-effector target X (ankle or wrist)
 * @param targetY Desired end-effector target Y (ankle or wrist)
 * @param len1 Upper bone length (thigh or bicep)
 * @param len2 Lower bone length (shin or forearm)
 * @param isLeg True if solving leg (hip->knee->ankle), false if arm (shoulder->elbow->wrist)
 * @param facingRight True if character faces right (+X), false if left (-X)
 */
export function solveTwoBoneIK(
  rootX: number,
  rootY: number,
  targetX: number,
  targetY: number,
  len1: number,
  len2: number,
  isLeg = true,
  facingRight = true
): TwoBoneIKSolution {
  // Screen space: positive Y is downward in Stick Nodes canvas
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  const dist = Math.hypot(dx, dy);

  // Clamp distance to avoid triangle singularity or NaN from acos
  const minReach = Math.abs(len1 - len2) + 1.0;
  const maxReach = len1 + len2 - 1.0;
  const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

  // Law of cosines for interior bend angle beta
  const cosBeta = (len1 * len1 + len2 * len2 - clampedDist * clampedDist) / (2 * len1 * len2);
  const betaRad = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
  const interiorAngleDeg = (betaRad * 180) / Math.PI;

  // Law of cosines for angle alpha between upper bone and root-target line
  const cosAlpha = (len1 * len1 + clampedDist * clampedDist - len2 * len2) / (2 * len1 * clampedDist);
  const alphaRad = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const alphaDeg = (alphaRad * 180) / Math.PI;

  // Angle from root to target in Stick Nodes world coordinates:
  // Math.atan2 takes (y, x). In our coordinate frame, world angle 0 is +X, 90 is -Y (up), -90 is +Y (down).
  const targetAngleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;

  let upperAngleDeg: number;

  if (isLeg) {
    // Knee polarity rule:
    // When facing Right (+X): knee must bend forward (+X), so upper angle is targetAngle + alpha
    // When facing Left (-X): knee must bend forward (-X), so upper angle is targetAngle - alpha
    if (facingRight) {
      upperAngleDeg = targetAngleDeg + alphaDeg;
    } else {
      upperAngleDeg = targetAngleDeg - alphaDeg;
    }
  } else {
    // Arm polarity rule:
    // When facing Right (+X): elbow bends down/inward towards torso
    if (facingRight) {
      upperAngleDeg = targetAngleDeg - alphaDeg;
    } else {
      upperAngleDeg = targetAngleDeg + alphaDeg;
    }
  }

  // Calculate knee/elbow coordinate from solved upper bone angle
  const upperRad = (upperAngleDeg * Math.PI) / 180;
  const midX = rootX + Math.cos(upperRad) * len1;
  const midY = rootY - Math.sin(upperRad) * len1;

  // Lower bone angle from knee/elbow to target
  const lowerAngleDeg = (Math.atan2(-(targetY - midY), targetX - midX) * 180) / Math.PI;

  // Verify polarity
  let hyperextended = false;
  if (isLeg) {
    const diff = normalizeDeg(upperAngleDeg - lowerAngleDeg);
    if (facingRight && diff < -1.0) {
      hyperextended = true;
    } else if (!facingRight && diff > 1.0) {
      hyperextended = true;
    }
  }

  return {
    upperAngleDeg: normalizeDeg(upperAngleDeg),
    lowerAngleDeg: normalizeDeg(lowerAngleDeg),
    interiorAngleDeg,
    reachAchieved: dist <= maxReach + 2.0,
    hyperextended,
  };
}

/**
 * Pins a character's stance foot to a ground or platform surface by solving leg IK.
 * Updates the given pose in-place and returns the updated pose.
 */
export function pinFootToSurface(
  pose: Pose17,
  side: 'right' | 'left',
  targetX: number,
  targetFootY: number = PHYSICS_CONFIG.environment.defaultGroundY,
  preserveFootAngle = false
): Pose17 {
  const joints = computeForwardKinematics17(pose);
  const scale = pose.scale;
  const { boneLengths } = PHYSICS_CONFIG.skeleton;

  const thighIdx = side === 'right' ? 1 : 4;
  const shinIdx = side === 'right' ? 2 : 5;
  const footIdx = side === 'right' ? 3 : 6;

  const hipX = joints[thighIdx].startX;
  const hipY = joints[thighIdx].startY;

  const lenThigh = boneLengths[thighIdx] * scale;
  const lenShin = boneLengths[shinIdx] * scale;
  const lenFoot = boneLengths[footIdx] * scale;

  const footAngle = preserveFootAngle
    ? pose.angles[footIdx]
    : pose.facingRight
    ? 0
    : 180;

  const rad = (footAngle * Math.PI) / 180;
  // Downward vertical offset from ankle to foot tip
  const footDropY = -Math.sin(rad) * lenFoot;
  const ankleTargetY = targetFootY - Math.max(0, footDropY);
  const ankleTargetX = targetX - (pose.facingRight ? Math.cos(rad) * lenFoot * 0.5 : -Math.cos(rad) * lenFoot * 0.5);

  const ik = solveTwoBoneIK(
    hipX,
    hipY,
    ankleTargetX,
    ankleTargetY,
    lenThigh,
    lenShin,
    true,
    pose.facingRight
  );

  pose.angles[thighIdx] = ik.upperAngleDeg;
  pose.angles[shinIdx] = ik.lowerAngleDeg;
  pose.angles[footIdx] = footAngle;

  return pose;
}

/**
 * Solves arm reach towards a target point (e.g. for punches, blocks, or catches).
 */
export function solveArmIK(
  pose: Pose17,
  side: 'right' | 'left',
  targetX: number,
  targetY: number
): Pose17 {
  const joints = computeForwardKinematics17(pose);
  const scale = pose.scale;
  const { boneLengths } = PHYSICS_CONFIG.skeleton;

  const bicepIdx = side === 'right' ? 9 : 14;
  const forearmIdx = side === 'right' ? 10 : 15;
  const handIdx = side === 'right' ? 11 : 16;

  const shoulderX = joints[bicepIdx].startX;
  const shoulderY = joints[bicepIdx].startY;

  const lenBicep = boneLengths[bicepIdx] * scale;
  const lenForearm = boneLengths[forearmIdx] * scale;

  const ik = solveTwoBoneIK(
    shoulderX,
    shoulderY,
    targetX,
    targetY,
    lenBicep,
    lenForearm,
    false,
    pose.facingRight
  );

  pose.angles[bicepIdx] = ik.upperAngleDeg;
  pose.angles[forearmIdx] = ik.lowerAngleDeg;
  // Hand aligns with forearm by default
  pose.angles[handIdx] = ik.lowerAngleDeg;

  return pose;
}

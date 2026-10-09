import { SparseKeyframe17, Pose17, EasingType } from './types';
import { evaluateEasing, interpolateAngleDeg } from './easing';
import { pinFootToSurface } from './ikSolvers';
import { computeForwardKinematics17 } from './forwardKinematics';
import {
  applyFollowThroughLag,
  applyMovingHoldBreathing,
  applyAnimateOnTwos,
} from './secondaryMotion';
import { PHYSICS_CONFIG } from './config';
import { enforceAnatomicalConstraints17 } from '../../skills/skeleton/AnatomicalConstraints';

export interface ExpansionOptions {
  totalFrames?: number;
  enableFollowThrough?: boolean;
  enableMovingHolds?: boolean;
  animateOnTwos?: boolean;
  defaultGroundY?: number;
  /** Re-project joint limits and foot contacts after secondary motion. Defaults to true. */
  enforceFinalConstraints?: boolean;
}

function enforceFinalPoseConstraints(frames: Pose17[], keyframes: SparseKeyframe17[], groundY: number): Pose17[] {
  const parents = PHYSICS_CONFIG.skeleton.parents;
  return frames.map((original, frameIndex) => {
    const pose: Pose17 = { ...original, angles: [...original.angles] };
    if (pose.angles.length !== 17) return pose;
    pose.angles = enforceAnatomicalConstraints17(pose.angles, parents, pose.facingRight).constrainedAngles;
    const contacts = (side: 'left' | 'right') => {
      const field = side === 'left' ? 'leftFootContact' : 'rightFootContact';
      let active: SparseKeyframe17 | undefined;
      for (const kf of keyframes) if (kf.frame <= frameIndex && kf[field]) active = kf;
      if (!active || !['PLANT', 'HEEL_STRIKE'].includes(active[field]!.state)) return null;
      const c = active[field]!;
      const offset = (side === 'right' ? 1 : -1) * (pose.facingRight ? 1 : -1) * 10;
      return { x: c.pinWorldX ?? active.pose.rootX + offset, y: c.groundY ?? groundY };
    };
    const left = contacts('left');
    const right = contacts('right');
    if (left) pinFootToSurface(pose, 'left', left.x, left.y);
    if (right) pinFootToSurface(pose, 'right', right.x, right.y);
    let joints = computeForwardKinematics17(pose);
    if (!left && joints[6].endY > groundY + 0.05) pinFootToSurface(pose, 'left', joints[6].endX, groundY);
    joints = computeForwardKinematics17(pose);
    if (!right && joints[3].endY > groundY + 0.05) pinFootToSurface(pose, 'right', joints[3].endX, groundY);
    return pose;
  });
}

/**
 * Expands sparse keyframes into a full, continuous angle-space frame sequence.
 * Guarantees constant bone lengths by interpolating purely in angle/root space
 * before forward kinematics.
 */
export function expandKeyframesToMotion(
  keyframes: SparseKeyframe17[],
  options: ExpansionOptions = {}
): Pose17[] {
  if (keyframes.length === 0) {
    return [];
  }

  const groundY = options.defaultGroundY ?? PHYSICS_CONFIG.environment.defaultGroundY;

  // Pre-pin keyframe poses to ensure exact stance continuity
  const sorted: SparseKeyframe17[] = keyframes
    .map((kf) => {
      const poseCopy: Pose17 = {
        ...kf.pose,
        angles: [...kf.pose.angles],
      };
      if (kf.leftFootContact?.state === 'PLANT') {
        const pinX = kf.leftFootContact.pinWorldX ?? (kf.pose.rootX - 10);
        const pinY = kf.leftFootContact.groundY ?? groundY;
        pinFootToSurface(poseCopy, 'left', pinX, pinY);
      }
      if (kf.rightFootContact?.state === 'PLANT') {
        const pinX = kf.rightFootContact.pinWorldX ?? (kf.pose.rootX + 10);
        const pinY = kf.rightFootContact.groundY ?? groundY;
        pinFootToSurface(poseCopy, 'right', pinX, pinY);
      }
      return {
        ...kf,
        pose: poseCopy,
      };
    })
    .sort((a, b) => a.frame - b.frame);

  const firstFrame = sorted[0].frame;
  const lastKeyframe = sorted[sorted.length - 1].frame;
  const totalFrames = options.totalFrames ?? lastKeyframe + 1;

  const rawFrames: Pose17[] = new Array(totalFrames);

  // Fill in frames before the first keyframe
  for (let f = 0; f < firstFrame; f++) {
    rawFrames[f] = {
      ...sorted[0].pose,
      angles: [...sorted[0].pose.angles],
    };
  }

  // Segment-by-segment interpolation
  for (let k = 0; k < sorted.length - 1; k++) {
    const kA = sorted[k];
    const kB = sorted[k + 1];
    const span = kB.frame - kA.frame;

    if (span <= 0) {
      rawFrames[kA.frame] = {
        ...kA.pose,
        angles: [...kA.pose.angles],
      };
      continue;
    }

    const jointsA = computeForwardKinematics17(kA.pose);

    for (let f = kA.frame; f <= kB.frame; f++) {
      const alpha = (f - kA.frame) / span;

      // Determine easing
      const defaultEasing: EasingType =
        typeof kA.easing === 'string' ? kA.easing : 'easeInOutQuad';

      const easedT = evaluateEasing(defaultEasing, alpha);

      // Root position interpolation
      const rootX = kA.pose.rootX + (kB.pose.rootX - kA.pose.rootX) * easedT;
      const rootY = kA.pose.rootY + (kB.pose.rootY - kA.pose.rootY) * easedT;
      const scale = kA.pose.scale + (kB.pose.scale - kA.pose.scale) * easedT;
      const facingRight = alpha < 0.5 ? kA.pose.facingRight : kB.pose.facingRight;

      // Per-joint angle interpolation along shortest arc
      const angles = new Array(17);
      for (let j = 0; j < 17; j++) {
        let jointEasing = defaultEasing;
        if (typeof kA.easing === 'object' && kA.easing[j]) {
          jointEasing = kA.easing[j]!;
        }
        const jointT = evaluateEasing(jointEasing, alpha);
        angles[j] = interpolateAngleDeg(kA.pose.angles[j], kB.pose.angles[j], jointT);
      }

      const pose: Pose17 = {
        rootX,
        rootY,
        scale,
        angles,
        facingRight,
      };

      // 1. Stance foot pinning: zero foot slip while foot is planted
      const leftPinAX = kA.leftFootContact?.pinWorldX;
      const leftPinBX = kB.leftFootContact?.pinWorldX;
      const isLeftStationaryStance =
        kA.leftFootContact?.state === 'PLANT' &&
        kB.leftFootContact?.state === 'PLANT' &&
        (leftPinAX === undefined || leftPinBX === undefined || Math.abs(leftPinAX - leftPinBX) <= 2.0);

      if (isLeftStationaryStance) {
        const pinX = leftPinAX ?? leftPinBX ?? (kA.pose.rootX - 10);
        const pinY = kA.leftFootContact?.groundY ?? kB.leftFootContact?.groundY ?? groundY;
        pinFootToSurface(pose, 'left', pinX, pinY);
      } else if (
        kA.leftFootContact?.state === 'PLANT' &&
        kB.leftFootContact?.state === 'PLANT' &&
        f > kA.frame
      ) {
        // Stepping foot: swings from start pinX to target pinX with clearance arc
        const startX = leftPinAX ?? (kA.pose.rootX - 10);
        const targetX = leftPinBX ?? (kB.pose.rootX - 10);
        const currX = startX + (targetX - startX) * easedT;
        const clearance = f === kB.frame ? 0 : 20.0 * Math.sin(Math.PI * alpha);
        pinFootToSurface(pose, 'left', currX, groundY - clearance);
      } else if (kB.leftFootContact?.state === 'PLANT' && f > kA.frame) {
        // Swing leg moving toward target plant
        const startX = jointsA[6].endX;
        const targetX = kB.leftFootContact.pinWorldX ?? (kB.pose.rootX - 10);
        const currX = startX + (targetX - startX) * easedT;
        // Swing foot parabola: elevates during swing, touches down at alpha = 1.0
        const clearance = f === kB.frame ? 0 : 20.0 * Math.sin(Math.PI * alpha);
        pinFootToSurface(pose, 'left', currX, groundY - clearance);
      }

      const rightPinAX = kA.rightFootContact?.pinWorldX;
      const rightPinBX = kB.rightFootContact?.pinWorldX;
      const isRightStationaryStance =
        kA.rightFootContact?.state === 'PLANT' &&
        kB.rightFootContact?.state === 'PLANT' &&
        (rightPinAX === undefined || rightPinBX === undefined || Math.abs(rightPinAX - rightPinBX) <= 2.0);

      if (isRightStationaryStance) {
        const pinX = rightPinAX ?? rightPinBX ?? (kA.pose.rootX + 10);
        const pinY = kA.rightFootContact?.groundY ?? kB.rightFootContact?.groundY ?? groundY;
        pinFootToSurface(pose, 'right', pinX, pinY);
      } else if (
        kA.rightFootContact?.state === 'PLANT' &&
        kB.rightFootContact?.state === 'PLANT' &&
        f > kA.frame
      ) {
        // Stepping foot: swings from start pinX to target pinX with clearance arc
        const startX = rightPinAX ?? (kA.pose.rootX + 10);
        const targetX = rightPinBX ?? (kB.pose.rootX + 10);
        const currX = startX + (targetX - startX) * easedT;
        const clearance = f === kB.frame ? 0 : 20.0 * Math.sin(Math.PI * alpha);
        pinFootToSurface(pose, 'right', currX, groundY - clearance);
      } else if (kB.rightFootContact?.state === 'PLANT' && f > kA.frame) {
        // Swing leg moving toward target plant
        const startX = jointsA[3].endX;
        const targetX = kB.rightFootContact.pinWorldX ?? (kB.pose.rootX + 10);
        const currX = startX + (targetX - startX) * easedT;
        const clearance = f === kB.frame ? 0 : 20.0 * Math.sin(Math.PI * alpha);
        pinFootToSurface(pose, 'right', currX, groundY - clearance);
      }

      // Final ground perimeter barrier for non-stance feet
      const curJ = computeForwardKinematics17(pose);
      if (!isRightStationaryStance && curJ[3].endY > groundY) {
        pinFootToSurface(pose, 'right', curJ[3].endX, groundY);
      }
      if (!isLeftStationaryStance && curJ[6].endY > groundY) {
        pinFootToSurface(pose, 'left', curJ[6].endX, groundY);
      }

      rawFrames[f] = pose;
    }
  }

  // Fill in any frames after the last keyframe
  for (let f = lastKeyframe + 1; f < totalFrames; f++) {
    rawFrames[f] = {
      ...sorted[sorted.length - 1].pose,
      angles: [...sorted[sorted.length - 1].pose.angles],
    };
  }

  // Post-processing passes
  let processed = rawFrames;

  // Moving hold breathing passes
  if (options.enableMovingHolds ?? true) {
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k].isMovingHold && sorted[k + 1].isMovingHold) {
        applyMovingHoldBreathing(processed, sorted[k].frame, sorted[k + 1].frame);
      }
    }
  }

  // Follow-through and overlap
  if (options.enableFollowThrough ?? true) {
    processed = applyFollowThroughLag(processed);
  }

  // Animate on twos if requested
  if (options.animateOnTwos) {
    processed = applyAnimateOnTwos(processed);
  }
  if (options.enforceFinalConstraints ?? true) processed = enforceFinalPoseConstraints(processed, sorted, groundY);
  return processed;
}

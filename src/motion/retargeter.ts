import { Pose17, SparseKeyframe17 } from './types';
import { interpolateAngleDeg } from './easing';
import { PHYSICS_CONFIG } from './config';

export interface MocapFrameKeypoints {
  frame: number;
  // Keypoints in world coordinates: [x, y, z] or [x, y]
  hips: [number, number, number?];
  spine: [number, number, number?];
  chest: [number, number, number?];
  neck: [number, number, number?];
  head: [number, number, number?];
  rShoulder: [number, number, number?];
  rElbow: [number, number, number?];
  rWrist: [number, number, number?];
  lShoulder: [number, number, number?];
  lElbow: [number, number, number?];
  lWrist: [number, number, number?];
  rHip: [number, number, number?];
  rKnee: [number, number, number?];
  rAnkle: [number, number, number?];
  lHip: [number, number, number?];
  lKnee: [number, number, number?];
  lAnkle: [number, number, number?];
}

export interface RetargetingOptions {
  projectionPlane?: 'sagittal_XY' | 'coronal_ZY';
  targetGroundY?: number;
  scale?: number;
  facingRight?: boolean;
  rootOffsetX?: number;
}

/**
 * Calculates a 2D world angle in degrees from parent (px, py) to child (cx, cy).
 * Screen space: positive Y is downward.
 */
function computeBoneAngleDeg(
  px: number,
  py: number,
  cx: number,
  cy: number
): number {
  const dx = cx - px;
  const dy = cy - py;
  return (Math.atan2(-dy, dx) * 180) / Math.PI;
}

/**
 * Retargets a sequence of 3D/2D mocap frame keypoints onto the Stick Nodes 17-node skeleton.
 */
export function retargetMocapToSkeleton17(
  mocapFrames: MocapFrameKeypoints[],
  options: RetargetingOptions = {}
): Pose17[] {
  const groundY = options.targetGroundY ?? PHYSICS_CONFIG.environment.defaultGroundY;
  const scale = options.scale ?? PHYSICS_CONFIG.skeleton.defaultScale;
  const facingRight = options.facingRight ?? true;
  const offsetX = options.rootOffsetX ?? 400.0;
  const useZY = options.projectionPlane === 'coronal_ZY';

  return mocapFrames.map((mf) => {
    // Project 3D points to 2D
    const project = (pt: [number, number, number?]): [number, number] => {
      if (useZY && pt[2] !== undefined) {
        return [pt[2], pt[1]];
      }
      return [pt[0], pt[1]];
    };

    const hips = project(mf.hips);
    const spine = project(mf.spine);
    const chest = project(mf.chest);
    const neck = project(mf.neck);
    const head = project(mf.head);

    const rShoulder = project(mf.rShoulder);
    const rElbow = project(mf.rElbow);
    const rWrist = project(mf.rWrist);

    const lShoulder = project(mf.lShoulder);
    const lElbow = project(mf.lElbow);
    const lWrist = project(mf.lWrist);

    const rHip = project(mf.rHip);
    const rKnee = project(mf.rKnee);
    const rAnkle = project(mf.rAnkle);

    const lHip = project(mf.lHip);
    const lKnee = project(mf.lKnee);
    const lAnkle = project(mf.lAnkle);

    const angles = new Array(17).fill(0);

    // 0: Root (Pelvis)
    angles[0] = 0;

    // Legs
    // 1: R Thigh (Hip -> Knee)
    angles[1] = computeBoneAngleDeg(rHip[0], rHip[1], rKnee[0], rKnee[1]);
    // 2: R Shin (Knee -> Ankle)
    angles[2] = computeBoneAngleDeg(rKnee[0], rKnee[1], rAnkle[0], rAnkle[1]);
    // 3: R Foot (Ankle horizontal)
    angles[3] = facingRight ? 0 : 180;

    // 4: L Thigh
    angles[4] = computeBoneAngleDeg(lHip[0], lHip[1], lKnee[0], lKnee[1]);
    // 5: L Shin
    angles[5] = computeBoneAngleDeg(lKnee[0], lKnee[1], lAnkle[0], lAnkle[1]);
    // 6: L Foot
    angles[6] = facingRight ? 0 : 180;

    // Spine
    // 7: Lower Spine (Hips -> Spine)
    angles[7] = computeBoneAngleDeg(hips[0], hips[1], spine[0], spine[1]);
    // 8: Upper Chest (Spine -> Chest)
    angles[8] = computeBoneAngleDeg(spine[0], spine[1], chest[0], chest[1]);

    // Right Arm
    // 9: R Bicep (Shoulder -> Elbow)
    angles[9] = computeBoneAngleDeg(rShoulder[0], rShoulder[1], rElbow[0], rElbow[1]);
    // 10: R Forearm (Elbow -> Wrist)
    angles[10] = computeBoneAngleDeg(rElbow[0], rElbow[1], rWrist[0], rWrist[1]);
    // 11: R Hand
    angles[11] = angles[10];

    // Head
    // 12: Neck (Chest -> Neck)
    angles[12] = computeBoneAngleDeg(chest[0], chest[1], neck[0], neck[1]);
    // 13: Head (Neck -> Head)
    angles[13] = computeBoneAngleDeg(neck[0], neck[1], head[0], head[1]);

    // Left Arm
    // 14: L Bicep
    angles[14] = computeBoneAngleDeg(lShoulder[0], lShoulder[1], lElbow[0], lElbow[1]);
    // 15: L Forearm
    angles[15] = computeBoneAngleDeg(lElbow[0], lElbow[1], lWrist[0], lWrist[1]);
    // 16: L Hand
    angles[16] = angles[15];

    // Determine root elevation so lowest foot aligns with groundY
    const lowestFootY = Math.max(rAnkle[1], lAnkle[1]);
    const rootY = groundY - (lowestFootY - hips[1]);

    return {
      rootX: hips[0] + offsetX,
      rootY,
      scale,
      angles,
      facingRight,
    };
  });
}

/**
 * Allows sparse author keyframes to override a mocap reference clip.
 * Blends smoothly between the mocap track and author keyframes over blendWindow frames.
 */
export function blendKeyframesOverMocap(
  mocapTrack: Pose17[],
  overrides: SparseKeyframe17[],
  blendWindow = 4
): Pose17[] {
  const result: Pose17[] = mocapTrack.map((p) => ({
    ...p,
    angles: [...p.angles],
  }));

  for (const kf of overrides) {
    const targetF = kf.frame;
    if (targetF < 0 || targetF >= result.length) continue;

    // Hard anchor at target frame
    result[targetF] = {
      ...kf.pose,
      angles: [...kf.pose.angles],
    };

    // Blend before
    for (let w = 1; w <= blendWindow; w++) {
      const prevF = targetF - w;
      if (prevF < 0) break;
      const alpha = 1.0 - w / (blendWindow + 1);
      const basePose = result[prevF];
      for (let j = 0; j < 17; j++) {
        basePose.angles[j] = interpolateAngleDeg(
          basePose.angles[j],
          kf.pose.angles[j],
          alpha * 0.7
        );
      }
    }

    // Blend after
    for (let w = 1; w <= blendWindow; w++) {
      const nextF = targetF + w;
      if (nextF >= result.length) break;
      const alpha = 1.0 - w / (blendWindow + 1);
      const basePose = result[nextF];
      for (let j = 0; j < 17; j++) {
        basePose.angles[j] = interpolateAngleDeg(
          basePose.angles[j],
          kf.pose.angles[j],
          alpha * 0.7
        );
      }
    }
  }

  return result;
}

/**
 * Parses basic BVH (Biovision Hierarchy) ASCII text into MocapFrameKeypoints.
 */
export function parseSimpleBvhToKeypoints(bvhText: string): MocapFrameKeypoints[] {
  const lines = bvhText.split(/\r?\n/).map((l) => l.trim());
  const motionIdx = lines.findIndex((l) => l.startsWith('MOTION'));
  if (motionIdx === -1) return [];

  const framesLine = lines.find((l) => l.startsWith('Frames:'));
  const frameCount = framesLine ? parseInt(framesLine.split(':')[1], 10) : 0;
  if (frameCount <= 0) return [];

  const dataStartIdx = lines.findIndex((l, i) => i > motionIdx && l.startsWith('Frame Time:')) + 1;
  const result: MocapFrameKeypoints[] = [];

  let f = 0;
  for (let i = dataStartIdx; i < lines.length && f < frameCount; i++) {
    const line = lines[i];
    if (!line) continue;
    const tokens = line.split(/\s+/).map(Number);
    if (tokens.length < 18) continue;

    // Approximate mapping from standard BVH joint order
    // tokens[0..2] is typically root translation (X, Y, Z)
    const rootX = tokens[0] || 0;
    const rootY = tokens[1] || 0;
    const rootZ = tokens[2] || 0;

    result.push({
      frame: f,
      hips: [rootX, rootY, rootZ],
      spine: [rootX, rootY + 50, rootZ],
      chest: [rootX, rootY + 90, rootZ],
      neck: [rootX, rootY + 130, rootZ],
      head: [rootX, rootY + 160, rootZ],
      rShoulder: [rootX + 25, rootY + 120, rootZ],
      rElbow: [rootX + 40, rootY + 80, rootZ],
      rWrist: [rootX + 50, rootY + 40, rootZ],
      lShoulder: [rootX - 25, rootY + 120, rootZ],
      lElbow: [rootX - 40, rootY + 80, rootZ],
      lWrist: [rootX - 50, rootY + 40, rootZ],
      rHip: [rootX + 15, rootY, rootZ],
      rKnee: [rootX + 18, rootY - 60, rootZ],
      rAnkle: [rootX + 20, rootY - 120, rootZ],
      lHip: [rootX - 15, rootY, rootZ],
      lKnee: [rootX - 18, rootY - 60, rootZ],
      lAnkle: [rootX - 20, rootY - 120, rootZ],
    });
    f++;
  }

  return result;
}

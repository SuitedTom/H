import { Pose17, Joint2D } from './types';
import { PHYSICS_CONFIG } from './config';

/**
 * Computes forward kinematics for the 17-node stickfigure skeleton.
 * Bone lengths are STRICTLY CONSTANT by construction because each joint's
 * endpoint is calculated as:
 *   endX = startX + cos(angleRad) * (baseBoneLength * scale)
 *   endY = startY - sin(angleRad) * (baseBoneLength * scale)
 * (Stick Nodes screen space: positive Y is downward, so -sin extends upward).
 */
export function computeForwardKinematics17(pose: Pose17): Joint2D[] {
  const { rootX, rootY, scale, angles } = pose;
  const { parents, boneLengths, boneNames } = PHYSICS_CONFIG.skeleton;
  const joints: Joint2D[] = new Array(17);

  for (let i = 0; i < 17; i++) {
    const parentIdx = parents[i];
    const baseLength = boneLengths[i] * scale;
    const angleDeg = angles[i] ?? 0;
    const rad = (angleDeg * Math.PI) / 180;

    let startX = rootX;
    let startY = rootY;

    if (parentIdx !== -1 && joints[parentIdx]) {
      startX = joints[parentIdx].endX;
      startY = joints[parentIdx].endY;
    }

    const endX = startX + Math.cos(rad) * baseLength;
    const endY = startY - Math.sin(rad) * baseLength;

    joints[i] = {
      index: i,
      name: boneNames[i] ?? `Node_${i}`,
      parentIndex: parentIdx,
      startX,
      startY,
      endX,
      endY,
      worldAngleDeg: angleDeg,
      length: baseLength,
    };
  }

  return joints;
}

/**
 * Returns key anatomical landmarks from a computed joint array.
 */
export function getAnatomicalLandmarks(joints: Joint2D[]) {
  return {
    pelvis: { x: joints[0].startX, y: joints[0].startY },
    rightHip: { x: joints[1].startX, y: joints[1].startY },
    rightKnee: { x: joints[1].endX, y: joints[1].endY },
    rightAnkle: { x: joints[2].endX, y: joints[2].endY },
    rightFootTip: { x: joints[3].endX, y: joints[3].endY },
    leftHip: { x: joints[4].startX, y: joints[4].startY },
    leftKnee: { x: joints[4].endX, y: joints[4].endY },
    leftAnkle: { x: joints[5].endX, y: joints[5].endY },
    leftFootTip: { x: joints[6].endX, y: joints[6].endY },
    lowerSpine: { x: joints[7].endX, y: joints[7].endY },
    upperChest: { x: joints[8].endX, y: joints[8].endY },
    rightShoulder: { x: joints[9].startX, y: joints[9].startY },
    rightElbow: { x: joints[9].endX, y: joints[9].endY },
    rightWrist: { x: joints[10].endX, y: joints[10].endY },
    rightHandTip: { x: joints[11].endX, y: joints[11].endY },
    neck: { x: joints[12].endX, y: joints[12].endY },
    headCenter: { x: joints[13].endX, y: joints[13].endY },
    leftShoulder: { x: joints[14].startX, y: joints[14].startY },
    leftElbow: { x: joints[14].endX, y: joints[14].endY },
    leftWrist: { x: joints[15].endX, y: joints[15].endY },
    leftHandTip: { x: joints[16].endX, y: joints[16].endY },
  };
}

/**
 * Estimates whole-body Center of Mass (CoM) based on standard biomechanical mass ratios.
 */
export function computeCenterOfMass(joints: Joint2D[]): { x: number; y: number } {
  // Biomechanical segment mass weights (sums to 1.0)
  const weights: Record<number, number> = {
    0: 0.16, // Pelvis
    7: 0.16, // Lower spine
    8: 0.18, // Upper chest
    13: 0.08, // Head
    1: 0.06, // R Thigh
    2: 0.04, // R Shin
    3: 0.015, // R Foot
    4: 0.06, // L Thigh
    5: 0.04, // L Shin
    6: 0.015, // L Foot
    9: 0.035, // R Bicep
    10: 0.025, // R Forearm
    11: 0.01, // R Hand
    14: 0.035, // L Bicep
    15: 0.025, // L Forearm
    16: 0.01, // L Hand
  };

  let totalX = 0;
  let totalY = 0;
  let totalW = 0;

  for (let i = 0; i < 17; i++) {
    const w = weights[i] ?? 0.01;
    const midX = (joints[i].startX + joints[i].endX) * 0.5;
    const midY = (joints[i].startY + joints[i].endY) * 0.5;
    totalX += midX * w;
    totalY += midY * w;
    totalW += w;
  }

  return {
    x: totalX / totalW,
    y: totalY / totalW,
  };
}

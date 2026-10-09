import { solveForwardKinematics17, solveTwoBoneIK } from '../skills/kinematicsSolvers';
import { STICKFIGURE_BONE_LENGTHS } from '../stknds/stickfigureStructure';
import type { MotionFrame } from './proceduralMotion';

export type GaitDirection = 'right' | 'left';
export type FootContactPhase = 'STANCE' | 'SWING';

export interface LocomotionOptions {
  /** Number of generated frames. */
  frameCount: number;
  /** Frames per complete gait cycle for one leg. */
  cycleFrames?: number;
  /** Root travel per complete gait cycle, in world pixels. */
  strideLengthPx?: number;
  /** Fraction of the cycle during which each foot is planted. */
  stanceFraction?: number;
  /** Maximum toe clearance during swing, in world pixels. */
  swingHeightPx?: number;
  /** Ground plane in screen coordinates (Y increases downward). */
  groundY?: number;
  /** Stick Nodes instance scale used by FK and IK. */
  scale?: number;
  startX?: number;
  /** If omitted, pelvis height is derived from leg length and scale. */
  startY?: number;
  direction?: GaitDirection;
  /** Optional initial 17-angle world pose; leg angles are solved every frame. */
  baseAngles?: number[];
  /** Maximum alternating arm swing around the default pose. */
  armSwingDeg?: number;
  /** Maximum allowed planted-toe drift in pixels for a passing report. */
  plantedFootTolerancePx?: number;
}

export interface FootTarget {
  x: number;
  y: number;
}

export interface ContactAwareLocomotionFrame extends MotionFrame {
  contacts: {
    rightFoot: FootContactPhase;
    leftFoot: FootContactPhase;
  };
  footTargets: {
    rightFoot: FootTarget;
    leftFoot: FootTarget;
  };
  footResidualPx: {
    rightFoot: number;
    leftFoot: number;
  };
}

export interface LocomotionReport {
  passed: boolean;
  frameCount: number;
  stanceFrameCount: { rightFoot: number; leftFoot: number };
  maxPlantedFootDriftPx: { rightFoot: number; leftFoot: number };
  maxGroundPenetrationPx: number;
  unreachableLimbFrames: number;
  diagnostics: string[];
}

export interface ContactAwareLocomotionResult {
  frames: ContactAwareLocomotionFrame[];
  report: LocomotionReport;
}

interface ScheduledFootTarget {
  target: FootTarget;
  phase: FootContactPhase;
  normalizedPhase: number;
  footAngleDeg: number;
}

const RIGHT_THIGH = 1;
const RIGHT_SHIN = 2;
const RIGHT_FOOT = 3;
const LEFT_THIGH = 4;
const LEFT_SHIN = 5;
const LEFT_FOOT = 6;
const RIGHT_BICEP = 9;
const RIGHT_FOREARM = 10;
const RIGHT_HAND = 11;
const LEFT_BICEP = 14;
const LEFT_FOREARM = 15;
const LEFT_HAND = 16;

function defaultAngles(): number[] {
  const angles = Array(17).fill(0) as number[];
  angles[RIGHT_THIGH] = -90;
  angles[RIGHT_SHIN] = -90;
  angles[RIGHT_FOOT] = 0;
  angles[LEFT_THIGH] = -90;
  angles[LEFT_SHIN] = -90;
  angles[LEFT_FOOT] = 0;
  angles[7] = 90;
  angles[8] = 90;
  angles[9] = -55;
  angles[10] = -80;
  angles[11] = -45;
  angles[12] = 90;
  angles[13] = 90;
  angles[14] = -125;
  angles[15] = -100;
  angles[16] = -135;
  return angles;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function footTargetAtFrame(
  frame: number,
  phaseOffset: number,
  options: Required<Pick<LocomotionOptions,
    'cycleFrames' | 'strideLengthPx' | 'stanceFraction' | 'swingHeightPx' | 'groundY' | 'scale' | 'startX' | 'startY' | 'direction'>>,
): ScheduledFootTarget {
  const cycleCoordinate = frame / options.cycleFrames + phaseOffset;
  const cycleIndex = Math.floor(cycleCoordinate);
  const phase = wrap01(cycleCoordinate);
  const sign = options.direction === 'right' ? 1 : -1;
  const cycleTravel = sign * options.strideLengthPx;
  const stanceStartFrame = (cycleIndex - phaseOffset) * options.cycleFrames;
  const currentLandingX = options.startX
    + (stanceStartFrame / options.cycleFrames) * cycleTravel
    + cycleTravel * options.stanceFraction * 0.5;
  const nextLandingX = currentLandingX + cycleTravel;

  const facingAngle = options.direction === 'right' ? 0 : 180;
  if (phase < options.stanceFraction) {
    return {
      target: { x: currentLandingX, y: options.groundY },
      phase: 'STANCE',
      normalizedPhase: phase,
      footAngleDeg: facingAngle,
    };
  }

  const swingProgress = Math.max(0, Math.min(
    1,
    (phase - options.stanceFraction) / (1 - options.stanceFraction),
  ));
  const footX = currentLandingX + (nextLandingX - currentLandingX) * swingProgress;
  const footY = options.groundY - options.swingHeightPx * Math.sin(Math.PI * swingProgress);
  const footLiftAngle = 22 * Math.sin(Math.PI * swingProgress);
  return {
    target: { x: footX, y: footY },
    phase: 'SWING',
    normalizedPhase: phase,
    footAngleDeg: options.direction === 'right'
      ? facingAngle + footLiftAngle
      : facingAngle - footLiftAngle,
  };
}

function solveLegToFootTarget(
  angles: number[],
  rootX: number,
  rootY: number,
  target: ScheduledFootTarget,
  side: 'right' | 'left',
  isRightFacing: boolean,
  scale: number,
) {
  const thighIndex = side === 'right' ? RIGHT_THIGH : LEFT_THIGH;
  const shinIndex = side === 'right' ? RIGHT_SHIN : LEFT_SHIN;
  const footIndex = side === 'right' ? RIGHT_FOOT : LEFT_FOOT;
  const thighLength = STICKFIGURE_BONE_LENGTHS[thighIndex];
  const shinLength = STICKFIGURE_BONE_LENGTHS[shinIndex];
  const footLength = STICKFIGURE_BONE_LENGTHS[footIndex];
  const radians = target.footAngleDeg * Math.PI / 180;

  // The desired target is the toe/end of the foot segment. IK solves the ankle,
  // so convert the toe target into the ankle target without losing the foot angle.
  const ankleX = target.target.x - Math.cos(radians) * footLength * scale;
  const ankleY = target.target.y + Math.sin(radians) * footLength * scale;
  const ik = solveTwoBoneIK(
    rootX,
    rootY,
    ankleX,
    ankleY,
    thighLength,
    shinLength,
    isRightFacing,
    'LEG',
    scale,
  );

  angles[thighIndex] = ik.upperAngleDeg;
  angles[shinIndex] = ik.lowerAngleDeg;
  angles[footIndex] = target.footAngleDeg;
  return { reachable: ik.reachable, ankleTarget: { x: ankleX, y: ankleY } };
}

/**
 * Generate a repeatable walk cycle using world-space foot targets and analytical
 * two-bone IK. During stance, toe targets are fixed in world space; during swing,
 * toes follow a clearance arc toward the next landing point.
 *
 * The returned report exposes unreachable poses and measured contact errors. This
 * is a 2D kinematic gait generator, not a full dynamic balance or force simulator.
 */
export function generateContactAwareLocomotion(
  input: LocomotionOptions,
): ContactAwareLocomotionResult {
  const options = {
    frameCount: input.frameCount,
    cycleFrames: input.cycleFrames ?? 24,
    strideLengthPx: input.strideLengthPx ?? 80,
    stanceFraction: input.stanceFraction ?? 0.62,
    swingHeightPx: input.swingHeightPx ?? 42,
    groundY: input.groundY ?? 755,
    scale: input.scale ?? 0.5,
    startX: input.startX ?? 100,
    startY: input.startY ?? input.groundY! - (
      STICKFIGURE_BONE_LENGTHS[RIGHT_THIGH] + STICKFIGURE_BONE_LENGTHS[RIGHT_SHIN]
    ) * (input.scale ?? 0.5) * 0.94,
    direction: input.direction ?? 'right',
  };

  if (!Number.isInteger(options.frameCount) || options.frameCount < 1) {
    throw new Error('frameCount must be a positive integer.');
  }
  if (!Number.isInteger(options.cycleFrames) || options.cycleFrames < 4) {
    throw new Error('cycleFrames must be an integer of at least 4.');
  }
  if (!Number.isFinite(options.strideLengthPx) || options.strideLengthPx <= 0) {
    throw new Error('strideLengthPx must be finite and positive.');
  }
  if (!Number.isFinite(options.stanceFraction) || options.stanceFraction <= 0.35 || options.stanceFraction >= 0.85) {
    throw new Error('stanceFraction must be between 0.35 and 0.85.');
  }
  if (!Number.isFinite(options.swingHeightPx) || options.swingHeightPx < 0) {
    throw new Error('swingHeightPx must be finite and non-negative.');
  }
  if (!Number.isFinite(options.groundY) || !Number.isFinite(options.startX) || !Number.isFinite(options.startY)) {
    throw new Error('Ground and root coordinates must be finite.');
  }
  if (!Number.isFinite(options.scale) || options.scale <= 0) {
    throw new Error('scale must be finite and positive.');
  }
  if (input.baseAngles && (input.baseAngles.length !== 17 || input.baseAngles.some((angle) => !Number.isFinite(angle)))) {
    throw new Error('baseAngles must contain exactly 17 finite world-space angles.');
  }

  const baseAngles = input.baseAngles ? [...input.baseAngles] : defaultAngles();
  const armSwingDeg = input.armSwingDeg ?? 24;
  const plantedFootTolerance = input.plantedFootTolerancePx ?? 0.75;
  if (!Number.isFinite(armSwingDeg) || armSwingDeg < 0 || !Number.isFinite(plantedFootTolerance) || plantedFootTolerance < 0) {
    throw new Error('Arm swing and planted-foot tolerance must be finite and non-negative.');
  }

  const frames: ContactAwareLocomotionFrame[] = [];
  const stanceFrameCount = { rightFoot: 0, leftFoot: 0 };
  const maxPlantedFootDriftPx = { rightFoot: 0, leftFoot: 0 };
  let maxGroundPenetrationPx = 0;
  let unreachableLimbFrames = 0;
  let previousRightToe: FootTarget | undefined;
  let previousLeftToe: FootTarget | undefined;
  const sign = options.direction === 'right' ? 1 : -1;
  const speedPxPerFrame = sign * options.strideLengthPx / options.cycleFrames;
  const isRightFacing = options.direction === 'right';

  for (let frameIndex = 0; frameIndex < options.frameCount; frameIndex += 1) {
    const rootX = options.startX + speedPxPerFrame * frameIndex;
    const rootY = options.startY;
    const rightTarget = footTargetAtFrame(frameIndex, 0, options);
    const leftTarget = footTargetAtFrame(frameIndex, 0.5, options);
    const angles = [...baseAngles];

    // Counter-swing the arms against their corresponding leg cycles.
    const rightArmSwing = armSwingDeg * Math.sin(2 * Math.PI * (rightTarget.normalizedPhase + 0.5));
    const leftArmSwing = armSwingDeg * Math.sin(2 * Math.PI * (leftTarget.normalizedPhase + 0.5));
    angles[RIGHT_BICEP] = baseAngles[RIGHT_BICEP] + rightArmSwing;
    angles[RIGHT_FOREARM] = baseAngles[RIGHT_FOREARM] + rightArmSwing * 0.42;
    angles[RIGHT_HAND] = baseAngles[RIGHT_HAND] + rightArmSwing * 0.18;
    angles[LEFT_BICEP] = baseAngles[LEFT_BICEP] - leftArmSwing;
    angles[LEFT_FOREARM] = baseAngles[LEFT_FOREARM] - leftArmSwing * 0.42;
    angles[LEFT_HAND] = baseAngles[LEFT_HAND] - leftArmSwing * 0.18;

    const rightIK = solveLegToFootTarget(
      angles, rootX, rootY, rightTarget, 'right', isRightFacing, options.scale,
    );
    const leftIK = solveLegToFootTarget(
      angles, rootX, rootY, leftTarget, 'left', isRightFacing, options.scale,
    );
    if (!rightIK.reachable) unreachableLimbFrames += 1;
    if (!leftIK.reachable) unreachableLimbFrames += 1;

    const joints = solveForwardKinematics17(rootX, rootY, angles, options.scale);
    const rightToe = { x: joints[RIGHT_FOOT].endX, y: joints[RIGHT_FOOT].endY };
    const leftToe = { x: joints[LEFT_FOOT].endX, y: joints[LEFT_FOOT].endY };
    const rightResidual = Math.hypot(rightToe.x - rightTarget.target.x, rightToe.y - rightTarget.target.y);
    const leftResidual = Math.hypot(leftToe.x - leftTarget.target.x, leftToe.y - leftTarget.target.y);

    if (rightTarget.phase === 'STANCE') {
      stanceFrameCount.rightFoot += 1;
      if (previousRightToe) {
        maxPlantedFootDriftPx.rightFoot = Math.max(
          maxPlantedFootDriftPx.rightFoot,
          Math.hypot(rightToe.x - previousRightToe.x, rightToe.y - previousRightToe.y),
        );
      }
    }
    if (leftTarget.phase === 'STANCE') {
      stanceFrameCount.leftFoot += 1;
      if (previousLeftToe) {
        maxPlantedFootDriftPx.leftFoot = Math.max(
          maxPlantedFootDriftPx.leftFoot,
          Math.hypot(leftToe.x - previousLeftToe.x, leftToe.y - previousLeftToe.y),
        );
      }
    }
    maxGroundPenetrationPx = Math.max(
      maxGroundPenetrationPx,
      Math.max(0, rightToe.y - options.groundY),
      Math.max(0, leftToe.y - options.groundY),
    );

    frames.push({
      frame: frameIndex,
      rootX,
      rootY,
      angles,
      phase: `locomotion:right-${rightTarget.phase.toLowerCase()}:left-${leftTarget.phase.toLowerCase()}`,
      plantedFootIndices: [
        ...(rightTarget.phase === 'STANCE' ? [RIGHT_FOOT] : []),
        ...(leftTarget.phase === 'STANCE' ? [LEFT_FOOT] : []),
      ],
      contacts: { rightFoot: rightTarget.phase, leftFoot: leftTarget.phase },
      footTargets: { rightFoot: rightTarget.target, leftFoot: leftTarget.target },
      footResidualPx: { rightFoot: rightResidual, leftFoot: leftResidual },
    });
    previousRightToe = rightToe;
    previousLeftToe = leftToe;
  }

  const diagnostics: string[] = [];
  if (maxPlantedFootDriftPx.rightFoot > plantedFootTolerance) {
    diagnostics.push(`Right planted foot drift ${maxPlantedFootDriftPx.rightFoot.toFixed(3)}px exceeds ${plantedFootTolerance.toFixed(3)}px.`);
  }
  if (maxPlantedFootDriftPx.leftFoot > plantedFootTolerance) {
    diagnostics.push(`Left planted foot drift ${maxPlantedFootDriftPx.leftFoot.toFixed(3)}px exceeds ${plantedFootTolerance.toFixed(3)}px.`);
  }
  if (maxGroundPenetrationPx > 0.05) {
    diagnostics.push(`Ground penetration reaches ${maxGroundPenetrationPx.toFixed(3)}px.`);
  }
  if (unreachableLimbFrames > 0) {
    diagnostics.push(`${unreachableLimbFrames} leg solves are outside the IK solver's preferred reachable range.`);
  }
  const report: LocomotionReport = {
    passed: diagnostics.length === 0,
    frameCount: frames.length,
    stanceFrameCount,
    maxPlantedFootDriftPx,
    maxGroundPenetrationPx,
    unreachableLimbFrames,
    diagnostics,
  };
  return { frames, report };
}

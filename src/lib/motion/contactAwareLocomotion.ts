import { solveForwardKinematics17, solveTwoBoneIK } from '../skills/kinematicsSolvers';
import { STICKFIGURE_BONE_LENGTHS } from '../stknds/stickfigureStructure';
import { calculateWeightedCenterOfMass, evaluateDynamicBalance } from '../physics/dynamicBalanceSolver';
import { computeBaseOfSupport } from '../physics/contactSupportEngine';
import type { BalanceStrategy } from '../physics/types';
import type { MotionFrame } from './proceduralMotion';

export type GaitDirection = 'right' | 'left';
export type GaitMode = 'walk' | 'run';
export type AccelerationProfile = 'constant' | 'easeIn' | 'easeOut' | 'easeInOut';
export type FootContactPhase = 'STANCE' | 'SWING';

export interface LocomotionOptions {
  /** Number of generated frames. */
  frameCount: number;
  /** Selects walk/run defaults while reusing this single gait solver. */
  mode?: GaitMode;
  /** Smooth horizontal speed profile. Run defaults to a short ease-in. */
  accelerationProfile?: AccelerationProfile;
  /** Frames used to accelerate from initialSpeedFraction to full speed. */
  accelerationFrames?: number;
  /** Optional ease-out duration at the end of the sequence. */
  decelerationFrames?: number;
  /** Initial speed as a fraction of terminal speed (0..1). */
  initialSpeedFraction?: number;
  /** Final-frame speed as a fraction of terminal speed (0..1). */
  finalSpeedFraction?: number;
  /** Vertical pelvis bob amplitude in world pixels; zero disables it. */
  pelvisBobPx?: number;
  /** Apply bounded corrections recommended by the existing dynamic-balance solver. */
  balanceRecovery?: boolean;
  /** Fraction of recommended counter-lean to apply, clamped to 0..1. */
  balanceCorrectionStrength?: number;
  characterMass?: number;
  /** Gravity in px/s²; converted to per-frame units for the balance solver. */
  gravityPxPerSecond2?: number;
  fps?: number;
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
  rootVelocityX: number;
  rootAccelerationX: number;
  balance: {
    isBalanced: boolean;
    stabilityMargin: number;
    strategy: BalanceStrategy;
    recommendedCounterLeanDeg: number;
    appliedCounterLeanDeg: number;
    centerOfMass: { x: number; y: number };
  };
}

export interface LocomotionReport {
  passed: boolean;
  frameCount: number;
  stanceFrameCount: { rightFoot: number; leftFoot: number };
  maxPlantedFootDriftPx: { rightFoot: number; leftFoot: number };
  maxGroundPenetrationPx: number;
  unreachableLimbFrames: number;
  unbalancedFrames: number;
  balanceRecoveryFrames: number;
  minimumStabilityMarginPx: number;
  maximumAppliedCounterLeanDeg: number;
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
  cycleCoordinateInput: number,
  phaseOffset: number,
  phaseAdvance: number,
  options: Required<Pick<LocomotionOptions,
    'cycleFrames' | 'strideLengthPx' | 'stanceFraction' | 'swingHeightPx' | 'groundY' | 'scale' | 'startX' | 'startY' | 'direction'>>,
): ScheduledFootTarget {
  const cycleCoordinate = cycleCoordinateInput + phaseOffset;
  const cycleIndex = Math.floor(cycleCoordinate);
  const phase = wrap01(cycleCoordinate);
  const sign = options.direction === 'right' ? 1 : -1;
  const cycleTravel = sign * options.strideLengthPx;
  const currentLandingX = options.startX
    + (cycleIndex - phaseOffset) * cycleTravel
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

  // The cycle is sampled at integer frames, so phase never equals exactly 1.
  // Snap the final sample to the landing endpoint to avoid a discontinuity at wrap.
  const isLastSampleBeforeWrap = phase + phaseAdvance >= 1 - 1e-9;
  const swingProgress = isLastSampleBeforeWrap ? 1 : Math.max(0, Math.min(
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
 * Generate contact-aware walk/run motion using the repository's existing two-bone
 * IK and dynamic-balance solver. Stance targets remain in world space while the
 * pelvis follows a configurable bob and acceleration-aware root trajectory.
 * Bounded torso counter-lean and arm counterbalance reuse existing physics recommendations;
 * this remains a 2D kinematic model, not a full force simulator.
 */
export function generateContactAwareLocomotion(
  input: LocomotionOptions,
): ContactAwareLocomotionResult {
  const mode = input.mode ?? 'walk';
  const options = {
    frameCount: input.frameCount,
    cycleFrames: input.cycleFrames ?? (mode === 'run' ? 16 : 24),
    strideLengthPx: input.strideLengthPx ?? (mode === 'run' ? 112 : 80),
    stanceFraction: input.stanceFraction ?? (mode === 'run' ? 0.48 : 0.62),
    swingHeightPx: input.swingHeightPx ?? (mode === 'run' ? 58 : 42),
    groundY: input.groundY ?? 755,
    scale: input.scale ?? 0.5,
    startX: input.startX ?? 100,
    startY: input.startY ?? (input.groundY ?? 755) - (
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

  if (mode !== 'walk' && mode !== 'run') throw new Error('mode must be walk or run.');
  const accelerationProfile = input.accelerationProfile ?? (mode === 'run' ? 'easeIn' : 'constant');
  const accelerationFrames = input.accelerationFrames ?? (mode === 'run' ? Math.min(10, options.cycleFrames) : 0);
  const decelerationFrames = input.decelerationFrames ?? 0;
  const initialSpeedFraction = input.initialSpeedFraction ?? 0.15;
  const finalSpeedFraction = input.finalSpeedFraction ?? 0.25;
  const pelvisBobPx = input.pelvisBobPx ?? (mode === 'run' ? 4.5 : 2.5);
  const balanceRecovery = input.balanceRecovery ?? true;
  const balanceCorrectionStrength = input.balanceCorrectionStrength ?? 0.65;
  const characterMass = input.characterMass ?? 100;
  const gravityPxPerSecond2 = input.gravityPxPerSecond2 ?? 980;
  const fps = input.fps ?? 24;
  if (!Number.isInteger(accelerationFrames) || accelerationFrames < 0 || !Number.isInteger(decelerationFrames) || decelerationFrames < 0) {
    throw new Error('Acceleration and deceleration frame counts must be non-negative integers.');
  }
  if (![initialSpeedFraction, finalSpeedFraction].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) {
    throw new Error('Initial and final speed fractions must be between 0 and 1.');
  }
  if (!Number.isFinite(pelvisBobPx) || pelvisBobPx < 0 || !Number.isFinite(balanceCorrectionStrength) || balanceCorrectionStrength < 0 || balanceCorrectionStrength > 1) {
    throw new Error('Pelvis bob must be non-negative and balance correction strength must be between 0 and 1.');
  }
  if (!Number.isFinite(characterMass) || characterMass <= 0 || !Number.isFinite(gravityPxPerSecond2) || gravityPxPerSecond2 <= 0 || !Number.isFinite(fps) || fps <= 0) {
    throw new Error('Mass, gravity, and fps must be finite and positive.');
  }
  if (!['constant', 'easeIn', 'easeOut', 'easeInOut'].includes(accelerationProfile)) {
    throw new Error('Unsupported acceleration profile.');
  }
  const baseAngles = input.baseAngles ? [...input.baseAngles] : defaultAngles();
  const armSwingDeg = input.armSwingDeg ?? (mode === 'run' ? 34 : 24);
  const plantedFootTolerance = input.plantedFootTolerancePx ?? 0.75;
  if (!Number.isFinite(armSwingDeg) || armSwingDeg < 0 || !Number.isFinite(plantedFootTolerance) || plantedFootTolerance < 0) {
    throw new Error('Arm swing and planted-foot tolerance must be finite and non-negative.');
  }

  const frames: ContactAwareLocomotionFrame[] = [];
  const stanceFrameCount = { rightFoot: 0, leftFoot: 0 };
  const maxPlantedFootDriftPx = { rightFoot: 0, leftFoot: 0 };
  let maxGroundPenetrationPx = 0;
  let unreachableLimbFrames = 0;
  let unbalancedFrames = 0;
  let balanceRecoveryFrames = 0;
  let minimumStabilityMarginPx = Infinity;
  let maximumAppliedCounterLeanDeg = 0;
  let previousCenterOfMass: { x: number; y: number } | undefined;
  let previousRootVelocityX = 0;
  let previousRootX = options.startX;
  let cycleCoordinate = 0;
  let previousRightToe: FootTarget | undefined;
  let previousLeftToe: FootTarget | undefined;
  let previousRightPhase: FootContactPhase | undefined;
  let previousLeftPhase: FootContactPhase | undefined;
  const sign = options.direction === 'right' ? 1 : -1;
  const isRightFacing = options.direction === 'right';
  const profileValue = (t: number): number => {
    const u = Math.max(0, Math.min(1, t));
    const easeIn = u * u * u * (10 + u * (-15 + 6 * u));
    if (accelerationProfile === 'constant') return u;
    if (accelerationProfile === 'easeIn') return easeIn;
    if (accelerationProfile === 'easeOut') {
      const v = 1 - u;
      return 1 - v * v * v * (10 + v * (-15 + 6 * v));
    }
    return u * u * (3 - 2 * u);
  };
  const speedScaleAt = (frameIndex: number): number => {
    let scale = 1;
    if (accelerationFrames > 0 && frameIndex < accelerationFrames) {
      const t = accelerationFrames <= 1 ? 1 : frameIndex / (accelerationFrames - 1);
      scale = initialSpeedFraction + (1 - initialSpeedFraction) * profileValue(t);
    }
    if (decelerationFrames > 0 && frameIndex >= options.frameCount - decelerationFrames) {
      const localIndex = frameIndex - (options.frameCount - decelerationFrames);
      const t = decelerationFrames <= 1 ? 1 : localIndex / (decelerationFrames - 1);
      const decel = finalSpeedFraction + (1 - finalSpeedFraction) * (1 - profileValue(t));
      scale = Math.min(scale, decel);
    }
    return scale;
  };

  for (let frameIndex = 0; frameIndex < options.frameCount; frameIndex += 1) {
    const speedScale = speedScaleAt(frameIndex);
    const phaseAdvance = speedScale / options.cycleFrames;
    const rootX = options.startX + sign * cycleCoordinate * options.strideLengthPx;
    const rootVelocityX = frameIndex === 0 ? 0 : rootX - previousRootX;
    const rootAccelerationX = rootVelocityX - previousRootVelocityX;
    const rootY = options.startY + Math.cos(2 * Math.PI * cycleCoordinate) * pelvisBobPx;
    const rightTarget = footTargetAtFrame(cycleCoordinate, 0, phaseAdvance, options);
    const leftTarget = footTargetAtFrame(cycleCoordinate, 0.5, phaseAdvance, options);
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

    let joints = solveForwardKinematics17(rootX, rootY, angles, options.scale);
    const initialCom = calculateWeightedCenterOfMass(joints, [], characterMass);
    const comVelocity = previousCenterOfMass
      ? { x: initialCom.x - previousCenterOfMass.x, y: initialCom.y - previousCenterOfMass.y }
      : { x: 0, y: 0 };
    const support = computeBaseOfSupport(joints, options.groundY);
    const legLengthPx = (STICKFIGURE_BONE_LENGTHS[RIGHT_THIGH] + STICKFIGURE_BONE_LENGTHS[RIGHT_SHIN]) * options.scale;
    const initialBalance = evaluateDynamicBalance(initialCom, comVelocity, support, legLengthPx, gravityPxPerSecond2 / (fps * fps));
    const appliedCounterLeanDeg = balanceRecovery ? initialBalance.recommendedCounterLeanDeg * balanceCorrectionStrength : 0;
    if (Math.abs(appliedCounterLeanDeg) > 1e-6) {
      angles[7] += appliedCounterLeanDeg;
      angles[8] += appliedCounterLeanDeg * 0.65;
      balanceRecoveryFrames += 1;
      maximumAppliedCounterLeanDeg = Math.max(maximumAppliedCounterLeanDeg, Math.abs(appliedCounterLeanDeg));
    }
    if (balanceRecovery && (initialBalance.recommendedStrategy === 'ARM_COUNTERBALANCE' || initialBalance.recommendedStrategy === 'STEPPING')) {
      const armSign = Math.sign(comVelocity.x) || Math.sign(initialCom.x - support.centerX) || 1;
      angles[RIGHT_BICEP] -= armSign * 8 * balanceCorrectionStrength;
      angles[LEFT_BICEP] -= armSign * 8 * balanceCorrectionStrength;
    }
    joints = solveForwardKinematics17(rootX, rootY, angles, options.scale);
    const finalCom = calculateWeightedCenterOfMass(joints, [], characterMass);
    const finalComVelocity = previousCenterOfMass
      ? { x: finalCom.x - previousCenterOfMass.x, y: finalCom.y - previousCenterOfMass.y }
      : { x: 0, y: 0 };
    const finalSupport = computeBaseOfSupport(joints, options.groundY);
    const finalBalance = evaluateDynamicBalance(finalCom, finalComVelocity, finalSupport, legLengthPx, gravityPxPerSecond2 / (fps * fps));
    if (!finalBalance.isBalanced) unbalancedFrames += 1;
    minimumStabilityMarginPx = Math.min(minimumStabilityMarginPx, finalBalance.stabilityMargin);
    const rightToe = { x: joints[RIGHT_FOOT].endX, y: joints[RIGHT_FOOT].endY };
    const leftToe = { x: joints[LEFT_FOOT].endX, y: joints[LEFT_FOOT].endY };
    const rightResidual = Math.hypot(rightToe.x - rightTarget.target.x, rightToe.y - rightTarget.target.y);
    const leftResidual = Math.hypot(leftToe.x - leftTarget.target.x, leftToe.y - leftTarget.target.y);

    if (rightTarget.phase === 'STANCE') {
      stanceFrameCount.rightFoot += 1;
      if (previousRightToe && previousRightPhase === 'STANCE') {
        maxPlantedFootDriftPx.rightFoot = Math.max(
          maxPlantedFootDriftPx.rightFoot,
          Math.hypot(rightToe.x - previousRightToe.x, rightToe.y - previousRightToe.y),
        );
      }
    }
    if (leftTarget.phase === 'STANCE') {
      stanceFrameCount.leftFoot += 1;
      if (previousLeftToe && previousLeftPhase === 'STANCE') {
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
      rootVelocityX,
      rootAccelerationX,
      balance: {
        isBalanced: finalBalance.isBalanced,
        stabilityMargin: finalBalance.stabilityMargin,
        strategy: initialBalance.recommendedStrategy,
        recommendedCounterLeanDeg: initialBalance.recommendedCounterLeanDeg,
        appliedCounterLeanDeg,
        centerOfMass: finalCom,
      },
    });
    previousRightToe = rightToe;
    previousLeftToe = leftToe;
    previousRightPhase = rightTarget.phase;
    previousLeftPhase = leftTarget.phase;
    previousCenterOfMass = finalCom;
    previousRootVelocityX = rootVelocityX;
    previousRootX = rootX;
    cycleCoordinate += phaseAdvance;
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
  if (unbalancedFrames > 0) {
    diagnostics.push(`${unbalancedFrames} frames remain outside the dynamic stability margin after bounded recovery.`);
  }
  const report: LocomotionReport = {
    passed: diagnostics.length === 0,
    frameCount: frames.length,
    stanceFrameCount,
    maxPlantedFootDriftPx,
    maxGroundPenetrationPx,
    unreachableLimbFrames,
    unbalancedFrames,
    balanceRecoveryFrames,
    minimumStabilityMarginPx: Number.isFinite(minimumStabilityMarginPx) ? minimumStabilityMarginPx : 0,
    maximumAppliedCounterLeanDeg,
    diagnostics,
  };
  return { frames, report };
}

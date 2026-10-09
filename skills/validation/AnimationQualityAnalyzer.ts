/**
 * Action-aware animation quality analyzer.
 *
 * Scores structural, kinematic, biomechanical, contact, visual-proxy, posture,
 * action-mechanics, and sequence-continuity domains. Numerical checks are
 * diagnostics, not a claim that passing values alone proves visual quality.
 */
import { STICKFIGURE_BONE_LENGTHS, STICKFIGURE_PARENTS } from '../../src/lib/stkndsCodec';
import { solveForwardKinematics17, type JointWorldPose } from '../ik/kinematicsSolvers';
import { enforceAnatomicalConstraints17 } from '../skeleton/AnatomicalConstraints';
import { calculateCenterOfMass17 } from '../physics/MassMomentumSecondaryPhysics';

export type MotionActionKind = 'generic' | 'walk' | 'run' | 'jump' | 'punch' | 'sword' | 'block' | 'fall' | 'land' | 'guard' | 'recover';
export interface FramePose {
  frameIndex: number;
  pelvisX: number;
  pelvisY: number;
  worldAnglesDeg: number[];
  isRightFacing?: boolean;
  scale?: number;
  action?: MotionActionKind;
  phase?: string;
  intentionalHold?: boolean;
  expectedContacts?: { leftPlanted?: boolean; rightPlanted?: boolean };
  handTarget?: { arm: 'left' | 'right'; x: number; y: number };
  weaponTip?: { x: number; y: number; angleDeg: number };
  weaponTarget?: { x: number; y: number };
}
export interface DomainAuditResult {
  domain: 'structural' | 'kinematic' | 'biomechanical' | 'contacts' | 'visual' | 'posture' | 'action' | 'continuity';
  score: number;
  passed: boolean;
  issues: string[];
  metrics: Record<string, number>;
}
export interface AnimationQualityReport {
  overallScore: number;
  passed: boolean;
  totalFrames: number;
  domainResults: Record<string, DomainAuditResult>;
  summary: string;
}
function signedDeltaDeg(from: number, to: number): number {
  return ((to - from + 180) % 360 + 360) % 360 - 180;
}
function absDeltaDeg(from: number, to: number): number {
  return Math.abs(signedDeltaDeg(from, to));
}
function finitePose(frame: FramePose): boolean {
  return Number.isFinite(frame.pelvisX) && Number.isFinite(frame.pelvisY)
    && frame.worldAnglesDeg.length === 17 && frame.worldAnglesDeg.every(Number.isFinite)
    && Number.isFinite(frame.scale ?? 0.5) && (frame.scale ?? 0.5) > 0;
}
function actionPhase(frame: FramePose): string {
  return `${frame.phase ?? ''} ${frame.action ?? ''}`.toLowerCase();
}
function scoreForIssueCount(count: number, penalty = 10): number {
  return Math.max(0, 100 - count * penalty);
}
function validJoints(frame: FramePose): JointWorldPose[] | null {
  return finitePose(frame) ? solveForwardKinematics17(frame.pelvisX, frame.pelvisY, frame.worldAnglesDeg, frame.scale ?? 0.5) : null;
}

/** Reuse the action-name vocabulary already used by presets and intent notes. */
export function inferMotionAction(intent?: string, preset?: string): MotionActionKind {
  const value = `${preset ?? ''} ${intent ?? ''}`.toLowerCase();
  if (/sword|blade|slash|weapon|cut/.test(value)) return 'sword';
  if (/punch|jab|cross|strike|fist/.test(value)) return 'punch';
  if (/block|parry|defend/.test(value)) return 'block';
  if (/run|sprint|dash|jog/.test(value)) return 'run';
  if (/walk|stroll|step|stride/.test(value)) return 'walk';
  if (/jump|leap|takeoff|take-off|flight|airborne/.test(value)) return 'jump';
  if (/land|landing|touchdown/.test(value)) return 'land';
  if (/fall|knockdown|tumble/.test(value)) return 'fall';
  if (/guard|ready stance/.test(value)) return 'guard';
  if (/recover|recovery|settle/.test(value)) return 'recover';
  return 'generic';
}

export class AnimationQualityAnalyzer {
  public analyzeAnimation(frames: FramePose[], groundY = 755.0, isRightFacing = true): AnimationQualityReport {
    if (frames.length === 0) return {
      overallScore: 0, passed: false, totalFrames: 0, domainResults: {},
      summary: 'Empty animation frames array provided.',
    };
    const structural = this.auditStructuralDomain(frames, isRightFacing);
    const kinematic = this.auditKinematicDomain(frames);
    const biomechanical = this.auditBiomechanicalDomain(frames);
    const contacts = this.auditContactDomain(frames, groundY);
    const visual = this.auditVisualDomain(frames);
    const posture = this.auditPostureDomain(frames);
    const action = this.auditActionDomain(frames);
    const continuity = this.auditContinuityDomain(frames);
    const domainResults = { structural, kinematic, biomechanical, contacts, visual, posture, action, continuity };
    const scores = Object.values(domainResults).map((domain) => domain.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const allPassed = Object.values(domainResults).every((domain) => domain.passed);
    return {
      overallScore: avgScore, passed: allPassed && avgScore >= 85, totalFrames: frames.length, domainResults,
      summary: `Action-aware audit complete. Score: ${avgScore.toFixed(1)}/100. Status: ${allPassed && avgScore >= 85 ? 'PASS' : 'NEEDS_REVIEW'}.`,
    };
  }

  private auditStructuralDomain(frames: FramePose[], defaultFacingRight: boolean): DomainAuditResult {
    const issues: string[] = [];
    let hingeViolations = 0, invalidFrames = 0, maxBoneLengthErrorPx = 0;
    for (const frame of frames) {
      if (!finitePose(frame)) {
        invalidFrames += 1;
        issues.push(`Frame ${frame.frameIndex}: invalid coordinates, scale, angle count, or non-finite joint angle.`);
        continue;
      }
      const constrained = enforceAnatomicalConstraints17(frame.worldAnglesDeg, STICKFIGURE_PARENTS, frame.isRightFacing ?? defaultFacingRight);
      hingeViolations += constrained.violationsCount;
      if (constrained.violationsCount) issues.push(`Frame ${frame.frameIndex}: ${constrained.violationsCount} anatomical limits would require correction.`);
      const joints = solveForwardKinematics17(frame.pelvisX, frame.pelvisY, frame.worldAnglesDeg, frame.scale ?? 0.5);
      for (let i = 1; i < joints.length; i += 1) {
        const actual = Math.hypot(joints[i].endX - joints[i].startX, joints[i].endY - joints[i].startY);
        maxBoneLengthErrorPx = Math.max(maxBoneLengthErrorPx, Math.abs(actual - STICKFIGURE_BONE_LENGTHS[i] * (frame.scale ?? 0.5)));
      }
    }
    return {
      domain: 'structural', score: scoreForIssueCount(invalidFrames * 10 + hingeViolations, 5),
      passed: invalidFrames === 0 && hingeViolations === 0 && maxBoneLengthErrorPx <= 0.1,
      issues, metrics: { invalidFrames, totalHingeViolations: hingeViolations, maxBoneLengthErrorPx },
    };
  }

  private auditKinematicDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let maxAngleJump = 0, maxRootStep = 0, maxAngularAcceleration = 0, comparedPairs = 0;
    let previousDeltas = new Array<number>(17).fill(0);
    for (let i = 1; i < frames.length; i += 1) {
      const prev = frames[i - 1], cur = frames[i];
      if (!finitePose(prev) || !finitePose(cur) || cur.frameIndex !== prev.frameIndex + 1) {
        previousDeltas = new Array<number>(17).fill(0);
        continue;
      }
      comparedPairs += 1;
      const rootStep = Math.hypot(cur.pelvisX - prev.pelvisX, cur.pelvisY - prev.pelvisY);
      maxRootStep = Math.max(maxRootStep, rootStep);
      if (rootStep > 45) issues.push(`Frame ${cur.frameIndex}: root displacement ${rootStep.toFixed(1)}px/frame is unusually large.`);
      const currentDeltas = new Array<number>(17);
      for (let j = 0; j < 17; j += 1) {
        const delta = signedDeltaDeg(prev.worldAnglesDeg[j], cur.worldAnglesDeg[j]);
        currentDeltas[j] = delta;
        maxAngleJump = Math.max(maxAngleJump, Math.abs(delta));
        maxAngularAcceleration = Math.max(maxAngularAcceleration, Math.abs(delta - previousDeltas[j]));
        if (Math.abs(delta) > 65) issues.push(`Frame ${cur.frameIndex}, joint ${j}: angular step ${delta.toFixed(1)}°/frame.`);
      }
      previousDeltas = currentDeltas;
    }
    if (maxAngularAcceleration > 75) issues.push(`Angular acceleration proxy peaks at ${maxAngularAcceleration.toFixed(1)}°/frame².`);
    return {
      domain: 'kinematic',
      score: Math.max(0, 100 - Math.max(0, maxAngleJump - 20) * 0.8 - Math.max(0, maxRootStep - 20) * 0.4),
      passed: maxAngleJump <= 65 && maxRootStep <= 45,
      issues, metrics: { maxAngleJumpDeg: maxAngleJump, maxRootStepPx: maxRootStep, maxAngularAccelerationDegPerFrame2: maxAngularAcceleration, comparedPairs },
    };
  }

  private auditBiomechanicalDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let maxComOffset = 0, maxComStep = 0;
    let prevCom: { comX: number; comY: number } | undefined;
    for (const frame of frames) {
      if (!finitePose(frame)) continue;
      const com = calculateCenterOfMass17(frame.pelvisX, frame.pelvisY, frame.worldAnglesDeg, frame.scale ?? 0.5);
      maxComOffset = Math.max(maxComOffset, Math.hypot(com.comX - frame.pelvisX, com.comY - frame.pelvisY));
      if (prevCom) maxComStep = Math.max(maxComStep, Math.hypot(com.comX - prevCom.comX, com.comY - prevCom.comY));
      prevCom = { comX: com.comX, comY: com.comY };
    }
    if (maxComOffset > 180) issues.push(`Center-of-mass offset from pelvis reaches ${maxComOffset.toFixed(1)}px; inspect pose/support relationship.`);
    if (maxComStep > 80) issues.push(`Center-of-mass displacement reaches ${maxComStep.toFixed(1)}px/frame.`);
    return {
      domain: 'biomechanical',
      score: Math.max(0, 100 - Math.max(0, maxComOffset - 100) * 0.25 - Math.max(0, maxComStep - 20) * 0.4),
      passed: maxComOffset <= 180 && maxComStep <= 80,
      issues, metrics: { maxComOffsetPx: maxComOffset, maxComStepPx: maxComStep },
    };
  }

  private auditContactDomain(frames: FramePose[], groundY: number): DomainAuditResult {
    const issues: string[] = [];
    let maxGroundPenetration = 0, maxPlantedFootDrift = 0, plantedFootComparisons = 0;
    for (let i = 0; i < frames.length; i += 1) {
      const cur = frames[i], joints = validJoints(cur);
      if (!joints) continue;
      for (const footIndex of [3, 6]) maxGroundPenetration = Math.max(maxGroundPenetration, Math.max(0, joints[footIndex].endY - groundY - 1));
      if (i === 0) continue;
      const prev = frames[i - 1], prevJoints = validJoints(prev);
      if (!prevJoints || cur.frameIndex !== prev.frameIndex + 1) continue;
      for (const [side, footIndex] of [['right', 3], ['left', 6]] as const) {
        const before = side === 'right' ? prev.expectedContacts?.rightPlanted : prev.expectedContacts?.leftPlanted;
        const now = side === 'right' ? cur.expectedContacts?.rightPlanted : cur.expectedContacts?.leftPlanted;
        if (!before || !now) continue;
        plantedFootComparisons += 1;
        maxPlantedFootDrift = Math.max(maxPlantedFootDrift, Math.hypot(joints[footIndex].endX - prevJoints[footIndex].endX, joints[footIndex].endY - prevJoints[footIndex].endY));
      }
    }
    if (maxGroundPenetration > 1.5) issues.push(`Ground penetration reaches ${maxGroundPenetration.toFixed(2)}px.`);
    if (maxPlantedFootDrift > 2) issues.push(`Planted-foot drift reaches ${maxPlantedFootDrift.toFixed(2)}px/frame.`);
    return {
      domain: 'contacts',
      score: Math.max(0, 100 - maxGroundPenetration * 8 - Math.max(0, maxPlantedFootDrift - 0.5) * 10),
      passed: maxGroundPenetration <= 1.5 && maxPlantedFootDrift <= 2,
      issues, metrics: { maxGroundPenetrationPx: maxGroundPenetration, maxPlantedFootDriftPx: maxPlantedFootDrift, plantedFootComparisons },
    };
  }

  private auditVisualDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let staticFreezeCount = 0, longestUnintentionalHold = 0, consecutiveStatic = 0;
    for (let i = 1; i < frames.length; i += 1) {
      const prev = frames[i - 1], cur = frames[i];
      if (!finitePose(prev) || !finitePose(cur) || cur.frameIndex !== prev.frameIndex + 1) { consecutiveStatic = 0; continue; }
      let identical = Math.hypot(cur.pelvisX - prev.pelvisX, cur.pelvisY - prev.pelvisY) < 0.01;
      if (identical) for (let j = 0; j < 17; j += 1) if (Math.abs(signedDeltaDeg(prev.worldAnglesDeg[j], cur.worldAnglesDeg[j])) > 0.01) { identical = false; break; }
      if (identical && !(cur.intentionalHold || prev.intentionalHold)) {
        consecutiveStatic += 1;
        longestUnintentionalHold = Math.max(longestUnintentionalHold, consecutiveStatic);
        if (consecutiveStatic > 6 && consecutiveStatic % 3 === 1) {
          staticFreezeCount += 1;
          issues.push(`Frame ${cur.frameIndex}: unintended static freeze exceeds six consecutive frames.`);
        }
      } else consecutiveStatic = 0;
    }
    return {
      domain: 'visual', score: Math.max(0, 100 - staticFreezeCount * 15), passed: staticFreezeCount === 0, issues,
      metrics: { staticFreezeViolations: staticFreezeCount, longestUnintentionalHoldFrames: longestUnintentionalHold },
    };
  }

  private auditPostureDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let maxSpineFold = 0, maxNeckMisalignment = 0, maxHeadMisalignment = 0, maxAbsoluteForwardLeanDeg = 0, postureChecks = 0;
    for (const frame of frames) {
      if (!finitePose(frame)) continue;
      const a = frame.worldAnglesDeg, facingSign = (frame.isRightFacing ?? true) ? 1 : -1;
      const trunkAngle = (a[7] + a[8]) * 0.5;
      const forwardLean = signedDeltaDeg(trunkAngle, 90) * facingSign;
      const spineFold = absDeltaDeg(a[7], a[8]);
      const neckMisalignment = absDeltaDeg(a[8], a[12]);
      const headMisalignment = absDeltaDeg(a[12], a[13]);
      maxAbsoluteForwardLeanDeg = Math.max(maxAbsoluteForwardLeanDeg, Math.abs(forwardLean));
      maxSpineFold = Math.max(maxSpineFold, spineFold);
      maxNeckMisalignment = Math.max(maxNeckMisalignment, neckMisalignment);
      maxHeadMisalignment = Math.max(maxHeadMisalignment, headMisalignment);
      postureChecks += 1;
      if (spineFold > 55) issues.push(`Frame ${frame.frameIndex}: lower/upper trunk mismatch is ${spineFold.toFixed(1)}°.`);
      if (neckMisalignment > 50) issues.push(`Frame ${frame.frameIndex}: neck/chest alignment differs by ${neckMisalignment.toFixed(1)}°.`);
      if (headMisalignment > 45) issues.push(`Frame ${frame.frameIndex}: head/neck alignment differs by ${headMisalignment.toFixed(1)}°.`);
      if (frame.action === 'run' && (forwardLean < -18 || forwardLean > 42)) issues.push(`Frame ${frame.frameIndex}: running forward-lean proxy ${forwardLean.toFixed(1)}° is outside the broad action range.`);
    }
    return {
      domain: 'posture', score: scoreForIssueCount(issues.length, 7), passed: issues.length === 0, issues,
      metrics: { postureChecks, maxTrunkSegmentMismatchDeg: maxSpineFold, maxNeckMisalignmentDeg: maxNeckMisalignment, maxHeadMisalignmentDeg: maxHeadMisalignment, maxAbsoluteForwardLeanDeg },
    };
  }

  private auditActionDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let runFrames = 0, runElbowViolations = 0, punchFrames = 0, punchReachMisses = 0, swordTargetChecks = 0, swordTargetMisses = 0;
    for (const frame of frames) {
      if (!finitePose(frame)) continue;
      const a = frame.worldAnglesDeg, phase = actionPhase(frame);
      if (frame.action === 'run') {
        runFrames += 1;
        const rightElbow = absDeltaDeg(a[9], a[10]), leftElbow = absDeltaDeg(a[14], a[15]);
        if (rightElbow < 25 || rightElbow > 160) { runElbowViolations += 1; issues.push(`Frame ${frame.frameIndex}: right running elbow flexion is ${rightElbow.toFixed(1)}°.`); }
        if (leftElbow < 25 || leftElbow > 160) { runElbowViolations += 1; issues.push(`Frame ${frame.frameIndex}: left running elbow flexion is ${leftElbow.toFixed(1)}°.`); }
      }
      if (frame.action === 'punch' && /extend|impact|contact|strike/.test(phase)) {
        punchFrames += 1;
        if (frame.handTarget) {
          const joints = validJoints(frame), handIndex = frame.handTarget.arm === 'right' ? 11 : 16;
          if (joints) {
            const miss = Math.hypot(joints[handIndex].endX - frame.handTarget.x, joints[handIndex].endY - frame.handTarget.y);
            if (miss > 18 * (frame.scale ?? 0.5)) { punchReachMisses += 1; issues.push(`Frame ${frame.frameIndex}: strike hand misses its target by ${miss.toFixed(1)}px.`); }
          }
        }
      }
      if (frame.action === 'sword' && frame.weaponTip && frame.weaponTarget) {
        swordTargetChecks += 1;
        const miss = Math.hypot(frame.weaponTip.x - frame.weaponTarget.x, frame.weaponTip.y - frame.weaponTarget.y);
        if (miss > 16 * (frame.scale ?? 0.5)) { swordTargetMisses += 1; issues.push(`Frame ${frame.frameIndex}: weapon tip misses its target by ${miss.toFixed(1)}px.`); }
      }
    }
    const violations = runElbowViolations + punchReachMisses + swordTargetMisses;
    return {
      domain: 'action', score: scoreForIssueCount(violations, 8), passed: violations === 0, issues,
      metrics: { runFrames, runElbowViolations, punchFrames, punchReachMisses, swordTargetChecks, swordTargetMisses },
    };
  }

  private auditContinuityDomain(frames: FramePose[]): DomainAuditResult {
    const issues: string[] = [];
    let maxRootAccelerationPx = 0, maxWeaponAngularStepDeg = 0, maxHandTrajectoryReversalDeg = 0, comparisons = 0;
    let previousRootVelocity: { x: number; y: number } | undefined;
    let previousHand: { x: number; y: number } | undefined;
    let previousHandVelocity: { x: number; y: number } | undefined;
    let previousWeaponAngle: number | undefined;
    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i], joints = validJoints(frame);
      if (!joints) continue;
      if (i > 0) {
        const prev = frames[i - 1];
        if (finitePose(prev) && frame.frameIndex === prev.frameIndex + 1) {
          const velocity = { x: frame.pelvisX - prev.pelvisX, y: frame.pelvisY - prev.pelvisY };
          if (previousRootVelocity) maxRootAccelerationPx = Math.max(maxRootAccelerationPx, Math.hypot(velocity.x - previousRootVelocity.x, velocity.y - previousRootVelocity.y));
          previousRootVelocity = velocity;
          comparisons += 1;
        } else previousRootVelocity = undefined;
      }
      const handIndex = frame.action === 'sword' && frame.weaponTip && frame.isRightFacing === false ? 16 : 11;
      const hand = { x: joints[handIndex].endX, y: joints[handIndex].endY };
      if (previousHand && previousHandVelocity) {
        const velocity = { x: hand.x - previousHand.x, y: hand.y - previousHand.y };
        const oldMag = Math.hypot(previousHandVelocity.x, previousHandVelocity.y), newMag = Math.hypot(velocity.x, velocity.y);
        if (oldMag > 0.5 && newMag > 0.5) {
          const cosine = Math.max(-1, Math.min(1, (previousHandVelocity.x * velocity.x + previousHandVelocity.y * velocity.y) / (oldMag * newMag)));
          maxHandTrajectoryReversalDeg = Math.max(maxHandTrajectoryReversalDeg, Math.acos(cosine) * 180 / Math.PI);
        }
        previousHandVelocity = velocity;
      } else if (previousHand) previousHandVelocity = { x: hand.x - previousHand.x, y: hand.y - previousHand.y };
      previousHand = hand;
      if (frame.weaponTip) {
        if (previousWeaponAngle !== undefined) maxWeaponAngularStepDeg = Math.max(maxWeaponAngularStepDeg, absDeltaDeg(previousWeaponAngle, frame.weaponTip.angleDeg));
        previousWeaponAngle = frame.weaponTip.angleDeg;
      } else previousWeaponAngle = undefined;
    }
    if (maxRootAccelerationPx > 60) issues.push(`Root acceleration proxy reaches ${maxRootAccelerationPx.toFixed(1)}px/frame².`);
    if (maxWeaponAngularStepDeg > 75) issues.push(`Weapon angular step reaches ${maxWeaponAngularStepDeg.toFixed(1)}°/frame.`);
    if (maxHandTrajectoryReversalDeg > 150) issues.push(`Hand trajectory reverses sharply by ${maxHandTrajectoryReversalDeg.toFixed(1)}°; inspect breakdown/contact frames.`);
    return {
      domain: 'continuity', score: scoreForIssueCount(issues.length, 12), passed: issues.length === 0, issues,
      metrics: { comparisons, maxRootAccelerationPxPerFrame2: maxRootAccelerationPx, maxWeaponAngularStepDeg, maxHandTrajectoryReversalDeg },
    };
  }
}

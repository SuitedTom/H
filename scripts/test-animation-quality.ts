import assert from 'node:assert/strict';
import { enforceAnatomicalConstraints17, getAnatomicalJointLimits } from '../skills/skeleton/AnatomicalConstraints';
import { SEGMENT_MASS_WEIGHTS_17, calculateCenterOfMass17 } from '../skills/physics/MassMomentumSecondaryPhysics';
import { AnimationQualityAnalyzer } from '../skills/validation/AnimationQualityAnalyzer';
import { compileIntentToMotion } from '../src/motion/intentParser';
import { getPosePreset } from '../src/motion/posePresets';
import { expandKeyframesToMotion } from '../src/motion/animator';
import { computeForwardKinematics17 } from '../src/motion/forwardKinematics';
import type { AnimationIntentDocument } from '../src/motion/intentSchema';
import type { Pose17, SparseKeyframe17 } from '../src/motion/types';

const parents = [-1, 0, 1, 2, 0, 4, 5, 0, 7, 8, 9, 10, 8, 12, 8, 14, 15];
assert.ok(getAnatomicalJointLimits(true)[10], 'node 10 is right forearm');
assert.ok(getAnatomicalJointLimits(true)[12], 'node 12 is neck');
assert.ok(getAnatomicalJointLimits(true)[13], 'node 13 is head');
assert.ok(getAnatomicalJointLimits(true)[15], 'node 15 is left forearm');
assert.equal(getAnatomicalJointLimits(true)[16], undefined, 'node 16 is not head');
assert.ok(Math.abs(SEGMENT_MASS_WEIGHTS_17.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-8);
assert.ok(SEGMENT_MASS_WEIGHTS_17[12] < SEGMENT_MASS_WEIGHTS_17[13]);
assert.ok(SEGMENT_MASS_WEIGHTS_17[14] > SEGMENT_MASS_WEIGHTS_17[13] / 2);

const neutral = getPosePreset('stand_neutral');
const corrupt = [...neutral];
corrupt[13] = corrupt[12] + 150;
const constrained = enforceAnatomicalConstraints17(corrupt, parents, true);
assert.ok(constrained.violationsCount > 0);
const relativeHead = ((constrained.constrainedAngles[13] - constrained.constrainedAngles[12] + 180) % 360 + 360) % 360 - 180;
assert.ok(Math.abs(relativeHead) <= 40.001);
assert.equal(corrupt[13], neutral[13] + 150, 'constraint pass must not mutate input');
const com = calculateCenterOfMass17(100, 250, neutral, 0.5);
assert.ok(Number.isFinite(com.comX) && Number.isFinite(com.comY));
assert.ok(Math.abs(com.totalMass - 1) < 1e-8);

const makePose = (rootX: number, rootY: number, angles: number[]): Pose17 => ({
  rootX, rootY, scale: 0.5, angles: [...angles], facingRight: true,
});
const contactKeys: SparseKeyframe17[] = [
  { frame: 0, pose: makePose(200, 500, neutral), leftFootContact: { state: 'PLANT', groundY: 630, pinWorldX: 210 } },
  { frame: 8, pose: makePose(208, 500, neutral), leftFootContact: { state: 'PLANT', groundY: 630, pinWorldX: 210 } },
  { frame: 12, pose: makePose(212, 500, neutral), leftFootContact: { state: 'TOE_OFF', groundY: 630, pinWorldX: 210 } },
];
const contactFrames = expandKeyframesToMotion(contactKeys, {
  totalFrames: 13, defaultGroundY: 630, enableFollowThrough: true, enableMovingHolds: false,
});
const plantedTips = [0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
  const joints = computeForwardKinematics17(contactFrames[index]);
  return { x: joints[6].endX, y: joints[6].endY };
});
const maxPinDrift = Math.max(...plantedTips.slice(1).map((tip) =>
  Math.hypot(tip.x - plantedTips[0].x, tip.y - plantedTips[0].y),
));
assert.ok(maxPinDrift < 3, `post-processing should preserve planted-foot contact; drift=${maxPinDrift}`);

const analyzer = new AnimationQualityAnalyzer();
const runFrames = ['run_contact_r', 'run_drive_r', 'run_flight_r', 'run_contact_l'].map((name, frameIndex) => ({
  frameIndex, pelvisX: 100 + frameIndex * 4, pelvisY: 400,
  worldAnglesDeg: getPosePreset(name), isRightFacing: true, scale: 0.5,
  action: 'run' as const, phase: name,
}));
const report = analyzer.analyzeAnimation(runFrames, 755, true);
for (const domain of ['structural', 'kinematic', 'biomechanical', 'contacts', 'visual', 'posture', 'action', 'continuity']) {
  assert.ok(report.domainResults[domain], `missing quality domain ${domain}`);
}
assert.equal(report.totalFrames, 4);
assert.ok(Number.isFinite(report.overallScore));

const intent: AnimationIntentDocument = {
  title: 'Action-aware posture regression',
  fps: 24,
  totalFrames: 24,
  groundY: 755,
  characters: [{
    id: 'fighter', name: 'Fighter', scale: 0.5,
    keyframes: [
      { frame: 0, intent: 'run contact', root: { x: 200, y: 480, facing: 'right' }, preset: 'run_contact_r' },
      { frame: 8, intent: 'run drive', root: { x: 215, y: 480, facing: 'right' }, preset: 'run_drive_r' },
      { frame: 16, intent: 'run flight', root: { x: 230, y: 470, facing: 'right' }, preset: 'run_flight_r' },
    ],
  }],
};
const track = compileIntentToMotion(intent)[0];
assert.equal(track.frames.length, 24);
assert.ok(track.qualityReport);
assert.equal(track.qualityReport!.totalFrames, 24);
assert.ok(track.qualityReport!.domainResults.action);
assert.ok(track.qualityReport!.domainResults.continuity);

console.log('Unified animation quality tests passed: canonical indices, mass/CoM, final stance projection, eight-domain QA, and compiled-track report.');

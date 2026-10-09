import assert from 'node:assert/strict';
import {
  generateContactAwareLocomotion,
  type ContactAwareLocomotionResult,
} from '../src/lib/motion/contactAwareLocomotion';

function makeWalk(overrides: Record<string, unknown> = {}): ContactAwareLocomotionResult {
  return generateContactAwareLocomotion({
    frameCount: 48,
    cycleFrames: 24,
    strideLengthPx: 60,
    swingHeightPx: 28,
    startX: 200,
    groundY: 500,
    ...overrides,
  });
}

const walk = makeWalk();
assert.equal(walk.frames.length, 48);
assert.equal(walk.frames[0].frame, 0);
assert.equal(walk.frames[47].frame, 47);
assert.ok(walk.frames.every((frame) => frame.angles.length === 17));
assert.ok(walk.frames.some((frame) => frame.contacts.rightFoot === 'STANCE'));
assert.ok(walk.frames.some((frame) => frame.contacts.rightFoot === 'SWING'));
assert.ok(walk.frames.some((frame) => frame.contacts.leftFoot === 'STANCE'));
assert.ok(walk.frames.some((frame) => frame.contacts.leftFoot === 'SWING'));
assert.ok(walk.frames.every((frame) => Number.isFinite(frame.footResidualPx.rightFoot)));
assert.ok(walk.frames.every((frame) => Number.isFinite(frame.footResidualPx.leftFoot)));
assert.ok(walk.report.maxGroundPenetrationPx < 0.1, JSON.stringify(walk.report));
assert.ok(
  walk.report.maxPlantedFootDriftPx.rightFoot < 1,
  `right drift: ${walk.report.maxPlantedFootDriftPx.rightFoot}; ${walk.report.diagnostics.join('; ')}`,
);
assert.ok(
  walk.report.maxPlantedFootDriftPx.leftFoot < 1,
  `left drift: ${walk.report.maxPlantedFootDriftPx.leftFoot}; ${walk.report.diagnostics.join('; ')}`,
);

// A planted toe target is held at the same world position during adjacent stance frames.
for (const side of ['rightFoot', 'leftFoot'] as const) {
  for (let i = 1; i < walk.frames.length; i += 1) {
    const prev = walk.frames[i - 1];
    const curr = walk.frames[i];
    if (prev.contacts[side] === 'STANCE' && curr.contacts[side] === 'STANCE') {
      assert.ok(
        Math.hypot(
          curr.footTargets[side].x - prev.footTargets[side].x,
          curr.footTargets[side].y - prev.footTargets[side].y,
        ) < 1e-8,
      );
    }
  }
}

const leftWalk = makeWalk({ direction: 'left', startX: 600 });
assert.ok(leftWalk.frames[leftWalk.frames.length - 1].rootX < leftWalk.frames[0].rootX);
assert.ok(leftWalk.frames.every((frame) => frame.angles.length === 17));

// Run mode reuses the same gait solver with faster cadence, greater clearance,
// a smooth acceleration ramp, pelvis bob, and existing balance recommendations.
const run = generateContactAwareLocomotion({
  frameCount: 40,
  mode: 'run',
  accelerationFrames: 8,
  decelerationFrames: 8,
  startX: 200,
  groundY: 500,
});
assert.equal(run.frames.length, 40);
assert.ok(run.frames.every((frame) => frame.angles.length === 17));
assert.ok(run.frames.every((frame) => Number.isFinite(frame.rootVelocityX)));
assert.ok(run.frames.every((frame) => Number.isFinite(frame.rootAccelerationX)));
assert.ok(run.frames.every((frame) => Number.isFinite(frame.balance.stabilityMargin)));
assert.ok(run.frames.every((frame) => Number.isFinite(frame.balance.centerOfMass.x)));
assert.ok(run.frames.some((frame) => Math.abs(frame.balance.appliedCounterLeanDeg) > 0));
assert.ok(run.report.balanceRecoveryFrames >= 0);
assert.ok(Number.isFinite(run.report.minimumStabilityMarginPx));
assert.ok(run.frames[2].rootVelocityX > run.frames[1].rootVelocityX,
  `expected acceleration ramp: ${run.frames[1].rootVelocityX}, ${run.frames[2].rootVelocityX}`);
assert.ok(run.frames.some((frame, index) => index > 0 && frame.rootY !== run.frames[index - 1].rootY),
  'pelvis bob should change root height over the gait cycle');

const constantSpeed = generateContactAwareLocomotion({
  frameCount: 8,
  cycleFrames: 8,
  strideLengthPx: 40,
  accelerationProfile: 'constant',
  accelerationFrames: 0,
  pelvisBobPx: 0,
  balanceRecovery: false,
});
assert.ok(constantSpeed.frames.every((frame) => frame.rootY === constantSpeed.frames[0].rootY));
assert.ok(Math.abs(constantSpeed.frames[4].rootVelocityX - constantSpeed.frames[3].rootVelocityX) < 1e-8);

assert.throws(() => generateContactAwareLocomotion({ frameCount: 0 }), /frameCount/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, cycleFrames: 2 }), /cycleFrames/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, stanceFraction: 1 }), /stanceFraction/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, baseAngles: [1, 2] }), /baseAngles/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, accelerationFrames: -1 }), /frame counts/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, balanceCorrectionStrength: 2 }), /balance correction strength/);

console.log('Contact-aware locomotion tests passed: walk/run phases, stance targets, IK, acceleration/deceleration, pelvis bob, balance integration, direction, and invalid options.');

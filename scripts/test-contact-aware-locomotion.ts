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

assert.throws(() => generateContactAwareLocomotion({ frameCount: 0 }), /frameCount/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, cycleFrames: 2 }), /cycleFrames/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, stanceFraction: 1 }), /stanceFraction/);
assert.throws(() => generateContactAwareLocomotion({ frameCount: 10, baseAngles: [1, 2] }), /baseAngles/);

console.log('Contact-aware locomotion tests passed: gait phases, 17-joint poses, stance targets, ground clearance, planted-foot drift, direction, and invalid options.');

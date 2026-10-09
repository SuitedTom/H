import assert from 'node:assert/strict';
import {
  easeMotion,
  generateFramesFromKeyframes,
  normalizeAngleDeltaDeg,
  type SparseMotionKeyframe,
} from '../src/lib/motion/proceduralMotion';
import { validateMotionFrames } from '../src/lib/motion/motionValidator';

const neutralAngles = Array.from({ length: 17 }, (_, i) => i === 0 ? 0 : 45);
function key(frame: number, rootX: number, angle: number): SparseMotionKeyframe {
  return { frame, rootX, rootY: 100, angles: neutralAngles.map((_, i) => i === 0 ? 0 : angle), phase: 'test' };
}

assert.equal(easeMotion(0.5, 'linear'), 0.5);
assert.equal(easeMotion(0.5, 'easeIn'), 0.25);
assert.equal(easeMotion(0.5, 'easeOut'), 0.75);
assert.equal(easeMotion(0.5, 'easeInOut'), 0.5);
assert.equal(easeMotion(0.5, 'hold'), 0);
assert.equal(easeMotion(1, 'hold'), 1);
assert.equal(normalizeAngleDeltaDeg(350), -10);
assert.equal(normalizeAngleDeltaDeg(-350), 10);

const generated = generateFramesFromKeyframes([
  { ...key(0, 0, 350), easingToNext: 'linear' },
  key(4, 40, 10),
]);
assert.equal(generated.length, 5);
assert.equal(generated[0].rootX, 0);
assert.equal(generated[2].rootX, 20);
assert.equal(generated[4].rootX, 40);
assert.equal(generated[2].angles[1], 360);
assert.equal(generated[4].angles[1], 10);

const eased = generateFramesFromKeyframes([
  { ...key(0, 0, 0), easingToNext: 'easeIn' },
  key(4, 40, 40),
]);
assert.equal(eased[1].rootX, 2.5);

assert.throws(() => generateFramesFromKeyframes([]), /At least one keyframe/);
assert.throws(() => generateFramesFromKeyframes([key(2, 0, 0), key(2, 1, 1)]), /strictly increasing/);
assert.throws(() => generateFramesFromKeyframes([{ ...key(0, 0, 0), angles: [1, 2] }]), /exactly 17/);

const validReport = validateMotionFrames(generated);
assert.equal(validReport.passed, true, validReport.diagnostics.join('; '));
assert.equal(validReport.frameCount, 5);
assert.ok(validReport.metrics.maxBoneLengthErrorPx < 1e-8);

const badReport = validateMotionFrames([
  { ...generated[0], frame: 0, angles: Array(17).fill(Number.NaN) },
]);
assert.equal(badReport.passed, false);
assert.ok(badReport.diagnostics.some((message) => message.includes('finite joint angles')));

console.log('Motion core tests passed: easing, shortest-angle interpolation, frame expansion, invalid inputs, FK segment lengths, and validator failure reporting.');

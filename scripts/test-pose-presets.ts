import assert from 'node:assert/strict';
import { CANONICAL_POSE_PRESETS, getPosePreset } from '../src/motion/posePresets';

const requiredPresets = [
  'run_contact_r',
  'run_drive_r',
  'run_flight_r',
  'run_contact_l',
  'run_drive_l',
  'run_flight_l',
  'block_high',
  'block_low',
  'fall_backward',
  'land_crouch',
  'strike_punch_chamber',
  'strike_punch_extend',
  'strike_punch_recover',
  'sword_guard',
  'sword_windup_high',
  'sword_slash_contact',
  'sword_followthrough',
  'sword_recover',
];

for (const name of requiredPresets) {
  const pose = getPosePreset(name);
  assert.equal(pose.length, 17, `${name} must define all 17 bone angles`);
  assert.ok(pose.every(Number.isFinite), `${name} must contain only finite angles`);
  assert.notEqual(pose, CANONICAL_POSE_PRESETS[name], `${name} must be returned as a defensive copy`);
}

for (const [name, pose] of Object.entries(CANONICAL_POSE_PRESETS)) {
  assert.equal(pose.length, 17, `${name} must define all 17 bone angles`);
  assert.ok(pose.every(Number.isFinite), `${name} must contain only finite angles`);
}

const angleDelta = (a: number, b: number) => {
  const delta = ((a - b + 180) % 360 + 360) % 360 - 180;
  return Math.abs(delta);
};
const elbowBend = (pose: number[], upperArm: number, forearm: number) =>
  angleDelta(pose[upperArm], pose[forearm]);

for (const name of ['run_contact_r', 'run_drive_r', 'run_flight_r', 'run_contact_l', 'run_drive_l', 'run_flight_l']) {
  const pose = getPosePreset(name);
  assert.ok(elbowBend(pose, 9, 10) >= 45 && elbowBend(pose, 9, 10) <= 145,
    `${name} right elbow should stay visibly flexed`);
  assert.ok(elbowBend(pose, 14, 15) >= 45 && elbowBend(pose, 14, 15) <= 145,
    `${name} left elbow should stay visibly flexed`);
}

assert.notDeepEqual(getPosePreset('sword_windup_high'), getPosePreset('sword_slash_contact'));
assert.notDeepEqual(getPosePreset('sword_slash_contact'), getPosePreset('sword_followthrough'));
assert.notDeepEqual(getPosePreset('sword_followthrough'), getPosePreset('sword_recover'));
assert.notDeepEqual(getPosePreset('strike_punch_chamber'), getPosePreset('strike_punch_extend'));
assert.notDeepEqual(getPosePreset('strike_punch_extend'), getPosePreset('strike_punch_recover'));

const copy = getPosePreset('sword_guard');
copy[9] = 12345;
assert.notEqual(getPosePreset('sword_guard')[9], 12345);

console.log(`Pose preset tests passed: ${Object.keys(CANONICAL_POSE_PRESETS).length} canonical poses, ${requiredPresets.length} required action poses, 17-angle shape, finite values, and bent run elbows.`);

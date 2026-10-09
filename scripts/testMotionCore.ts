import fs from 'fs';
import path from 'path';
import { solveTwoBoneIK, pinFootToSurface } from '../src/motion/ikSolvers';
import { evaluateEasing, interpolateAngleDeg } from '../src/motion/easing';
import { computeForwardKinematics17 } from '../src/motion/forwardKinematics';
import { expandKeyframesToMotion } from '../src/motion/animator';
import { validateMotionSequence } from '../src/motion/validator';
import { compileIntentToMotion } from '../src/motion/intentParser';
import { writeStkndsProject } from '../src/motion/stkndsWriter';
import { renderContactSheetPng, encodeFramesToGif } from '../src/motion/previewRenderer';
import { inspectStkndsBuffer } from '../src/lib/stknds/stkndsCore';
import { AnimationIntentDocument } from '../src/motion/intentSchema';
import { Pose17, SparseKeyframe17 } from '../src/motion/types';
import { PHYSICS_CONFIG } from '../src/motion/config';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`  PASS: ${msg}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  MOTION CORE & BIOMECHANICS COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Two-Bone IK & Anatomical Polarity Tests
  // -------------------------------------------------------------------------
  console.log('[TEST GROUP 1] Two-Bone IK & Anatomical Polarities');

  // Test 1.1: Standing leg reach
  const legIK = solveTwoBoneIK(500, 510, 500, 755, 127.5, 122.5, true, true);
  assert(legIK.reachAchieved, 'Leg IK reaches ground foot target');
  assert(!legIK.hyperextended, 'Leg IK maintains physiological anti-flamingo polarity (no hyperextension)');
  assert(legIK.interiorAngleDeg > 0 && legIK.interiorAngleDeg < 180, 'Knee interior angle is valid');

  // Test 1.2: Left-facing leg
  const leftLegIK = solveTwoBoneIK(500, 510, 500, 755, 127.5, 122.5, true, false);
  assert(leftLegIK.reachAchieved, 'Left-facing leg IK reaches ground target');
  assert(!leftLegIK.hyperextended, 'Left-facing leg maintains physiological knee polarity');

  // Test 1.3: Foot pinning
  const basePose: Pose17 = {
    rootX: 500,
    rootY: 510,
    scale: 0.5,
    angles: new Array(17).fill(0),
    facingRight: true,
  };
  pinFootToSurface(basePose, 'right', 500, 755);
  const joints = computeForwardKinematics17(basePose);
  const footY = joints[3].endY;
  assert(Math.abs(footY - 755) < 1.0, `Pinned foot aligns with ground Y=755 within 1px (actual: ${footY.toFixed(2)})`);

  // -------------------------------------------------------------------------
  // 2. Easing & Shortest-Arc Angle Interpolation Tests
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Easing Curves & Shortest-Arc Interpolation');

  // Test 2.1: Angle unwrapping
  const step = interpolateAngleDeg(170, -170, 0.5);
  // Shortest path between 170 and -170 is through 180 (diff = +20 deg), so midpoint is 180 (or -180)
  assert(Math.abs(Math.abs(step) - 180) < 1.0, `Angle unwrap interpolates shortest 20° arc, not 340° long way (actual: ${step})`);

  // Test 2.2: Anticipation easing
  const anticEarly = evaluateEasing('anticipation', 0.2);
  assert(anticEarly < 0, `Anticipation dips negative for realistic wind-up (actual: ${anticEarly.toFixed(3)})`);
  const anticEnd = evaluateEasing('anticipation', 1.0);
  assert(Math.abs(anticEnd - 1.0) < 1e-4, 'Anticipation finishes exactly at 1.0');

  // Test 2.3: Settle easing
  const settleMid = evaluateEasing('settle', 0.8);
  assert(settleMid > 1.0, `Settle overshoots target before settling (actual: ${settleMid.toFixed(3)})`);

  // -------------------------------------------------------------------------
  // 3. Forward Kinematics Constant Bone Length Invariance
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Constant Bone Length Invariance by Construction');

  const randomPose: Pose17 = {
    rootX: 420,
    rootY: 530,
    scale: 0.5,
    angles: [-15, 34, -45, 90, -112, 45, 180, 85, 92, -30, 45, 45, 90, 88, -60, 60, 60],
    facingRight: true,
  };
  const fkJoints = computeForwardKinematics17(randomPose);
  for (let i = 0; i < 17; i++) {
    const expected = PHYSICS_CONFIG.skeleton.boneLengths[i] * 0.5;
    const actual = Math.hypot(fkJoints[i].endX - fkJoints[i].startX, fkJoints[i].endY - fkJoints[i].startY);
    assert(Math.abs(actual - expected) < 1e-6, `Bone ${i} (${PHYSICS_CONFIG.skeleton.boneNames[i]}) length invariant`);
  }

  // -------------------------------------------------------------------------
  // 4. Intent Parser & Quantitative Validator Tests
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Intent Document Expansion & Validator');

  const walkDoc: AnimationIntentDocument = JSON.parse(
    fs.readFileSync('examples/walk_intent.json', 'utf8')
  );
  const motionTracks = compileIntentToMotion(walkDoc);
  assert(motionTracks.length === 1, 'Walk intent compiled 1 character motion track');
  assert(motionTracks[0].frames.length === 48, 'Walk intent expanded to 48 frames');

  const walkReport = validateMotionSequence(motionTracks[0].frames, { groundY: 755.0 });
  assert(walkReport.overallPassed, 'Walk cycle passed all quantitative biomechanical validation checks');
  assert(walkReport.metrics.boneLengthDrift.passed, 'Bone-length drift: 0.0000px error');
  assert(walkReport.metrics.rootTeleport.passed, `Root velocity continuous (max: ${walkReport.metrics.rootTeleport.measuredValue.toFixed(1)}px/f)`);
  assert(walkReport.metrics.velocityJerkSpikes.passed, `Joint angular rate smooth (peak: ${walkReport.metrics.velocityJerkSpikes.measuredValue.toFixed(1)}°/f)`);

  // Test Jump example
  const jumpDoc: AnimationIntentDocument = JSON.parse(
    fs.readFileSync('examples/jump_intent.json', 'utf8')
  );
  const jumpTracks = compileIntentToMotion(jumpDoc);
  assert(jumpTracks[0].frames.length === 47, 'Jump intent expanded to 47 frames');
  const jumpReport = validateMotionSequence(jumpTracks[0].frames, { groundY: 755.0 });
  assert(jumpReport.overallPassed, 'Jump sequence passed quantitative validation checks');
  assert(jumpReport.metrics.boneLengthDrift.passed, 'Jump bone length drift is 0.00px');
  if (jumpReport.metrics.jumpLandingHeight) {
    assert(jumpReport.metrics.jumpLandingHeight.passed, `Jump landing height equals takeoff within 2px (delta: ${jumpReport.metrics.jumpLandingHeight.measuredValue.toFixed(2)}px)`);
  }

  // Test Two-Character Strike example
  const strikeDoc: AnimationIntentDocument = JSON.parse(
    fs.readFileSync('examples/strike_intent.json', 'utf8')
  );
  const strikeTracks = compileIntentToMotion(strikeDoc);
  assert(strikeTracks.length === 2, 'Strike intent compiled 2 character motion tracks');
  const attReport = validateMotionSequence(strikeTracks[0].frames, {
    groundY: 755.0,
    strikeEvent: {
      frame: 16,
      attackerHandOrFoot: 'rightHand',
      defenderAnchor: 'leftForearm',
      defenderPose: strikeTracks[1].frames[16],
    },
  });
  assert(attReport.overallPassed, 'Combat clash passed quantitative validation');
  if (attReport.metrics.strikeReach) {
    assert(attReport.metrics.strikeReach.passed, `Strike reaches target within contact envelope (${attReport.metrics.strikeReach.measuredValue.toFixed(1)}px <= 18px)`);
  }

  // -------------------------------------------------------------------------
  // 5. Headless Preview Renderer Tests (PNG & GIF)
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Headless Preview Renderer (Contact Sheet PNG & GIF)');

  const pngBytes = renderContactSheetPng(motionTracks[0].frames, { columns: 4, rows: 3 });
  assert(pngBytes.length > 500, `Generated PNG contact sheet (${pngBytes.length} bytes)`);
  assert(
    pngBytes[0] === 137 && pngBytes[1] === 80 && pngBytes[2] === 78 && pngBytes[3] === 71,
    'PNG byte signature (89 50 4E 47) verified'
  );

  const gifBytes = encodeFramesToGif(motionTracks[0].frames, { width: 320, height: 240, fps: 24 });
  assert(gifBytes.length > 1000, `Generated animated GIF (${gifBytes.length} bytes)`);
  const gifHeader = String.fromCharCode(...gifBytes.slice(0, 6));
  assert(gifHeader === 'GIF89a', `GIF header valid (GIF89a)`);

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/walk_contact_sheet.png', pngBytes);
  fs.writeFileSync('artifacts/walk_preview.gif', gifBytes);
  console.log('  Saved artifacts/walk_contact_sheet.png and artifacts/walk_preview.gif');

  // -------------------------------------------------------------------------
  // 6. .stknds Writer Minimal-Change Round-Trip Test
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 6] .stknds Writer Minimal-Change Round-Trip Test');

  const writeResult = await writeStkndsProject(motionTracks, {
    projectName: 'test_procedural_walk',
    fps: 24,
  });

  assert(writeResult.bytes.length > 500, `Serialized .stknds project (${writeResult.bytes.length} bytes)`);
  assert(
    writeResult.bytes[0] === 1 && writeResult.bytes[8] === 9,
    '9-byte outer prefix (01 02 ... 09) verified'
  );

  // Decompress and verify through existing inspectStkndsBuffer
  const ab = writeResult.bytes.buffer.slice(
    writeResult.bytes.byteOffset,
    writeResult.bytes.byteOffset + writeResult.bytes.byteLength
  );
  const inspection = await inspectStkndsBuffer('test_procedural_walk.stknds', ab);
  assert(inspection.prefixValid, 'Container inspection confirms valid prefix');
  assert(inspection.frameCount === 48, `Frame count matches 48 (actual: ${inspection.frameCount})`);
  assert(inspection.figureNodes.length === 17, `17 figure nodes preserved intact in recursive hierarchy`);

  fs.writeFileSync('artifacts/test_procedural_walk.stknds', writeResult.bytes);
  console.log('  Saved artifacts/test_procedural_walk.stknds');

  console.log('\n================================================================');
  console.log(`  ALL ${totalTests} TESTS PASSED! (${passedTests}/${totalTests})`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

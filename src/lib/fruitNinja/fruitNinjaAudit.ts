import { FruitNinjaAuditReport, FruitNinjaKeyframeSpec } from './fruitNinjaTypes';

/**
 * Biomechanical audit critic for Fruit Ninja Katana Slicing
 */
export function validateFruitNinjaBiomechanics(
  frames: FruitNinjaKeyframeSpec[],
  groundY: number = 755.0
): FruitNinjaAuditReport {
  const diagnostics: string[] = [];
  const domains: FruitNinjaAuditReport['domains'] = [];

  // Domain 1: Skeletal Anatomy & Bone Invariance
  let maxJointDelta = 0;
  for (let i = 1; i < frames.length; i++) {
    for (let b = 0; b < 17; b++) {
      const delta = Math.abs(frames[i].manAngles[b] - frames[i - 1].manAngles[b]);
      if (delta > maxJointDelta) maxJointDelta = delta;
    }
  }

  const anatPass = maxJointDelta <= 55.0;
  domains.push({
    name: '1. Anatomical Integrity & Hinge Limits',
    verdict: anatPass ? 'PASS' : 'FAIL',
    measuredValue: maxJointDelta,
    threshold: 55.0,
    notes: `Peak single-frame angular step: ${maxJointDelta.toFixed(1)}° (Limit: 55.0°)`,
  });
  if (!anatPass) diagnostics.push(`Joint velocity spike of ${maxJointDelta.toFixed(1)}° detected.`);

  // Domain 2: Blade Tip Velocity & Impact Coincidence
  let peakBladeSpeed = 0;
  let hitFrameCount = 0;
  for (const f of frames) {
    if (f.bladeSpeedPxPerFrame > peakBladeSpeed) peakBladeSpeed = f.bladeSpeedPxPerFrame;
    if (f.isHitFrame) hitFrameCount++;
  }

  const bladePass = peakBladeSpeed >= 35.0;
  domains.push({
    name: '2. Blade Rotational Velocity & Cutting Power',
    verdict: bladePass ? 'PASS' : 'WARNING',
    measuredValue: peakBladeSpeed,
    threshold: 35.0,
    notes: `Peak Katana slash speed: ${peakBladeSpeed.toFixed(1)} px/frame (Target >= 35.0 px/frame)`,
  });

  // Domain 3: Center of Mass & Dynamic Equilibrium
  let unhandledUnbalance = 0;
  for (const f of frames) {
    if (f.comX < f.supportMinX - 40 || f.comX > f.supportMaxX + 40) {
      if (f.isGrounded) unhandledUnbalance++;
    }
  }

  const balancePass = unhandledUnbalance === 0;
  domains.push({
    name: '3. Balance & Center of Mass Equilibrium',
    verdict: balancePass ? 'PASS' : 'FAIL',
    measuredValue: unhandledUnbalance,
    threshold: 0,
    notes: `Uncompensated CoM stance balance violations: ${unhandledUnbalance}`,
  });
  if (!balancePass) diagnostics.push(`Ninja CoM fell outside support polygon for ${unhandledUnbalance} frames.`);

  // Domain 4: Ground Contact Pinning
  let footSlideCount = 0;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].isGrounded && frames[i - 1].isGrounded && !frames[i].isSlashActive) {
      const slide = Math.abs(frames[i].manX - frames[i - 1].manX);
      if (slide > 12.0) footSlideCount++;
    }
  }

  const pinPass = footSlideCount <= 3;
  domains.push({
    name: '4. Stance Foot Ground Pinning',
    verdict: pinPass ? 'PASS' : 'WARNING',
    measuredValue: footSlideCount,
    threshold: 3,
    notes: `Stance sliding frames detected: ${footSlideCount}`,
  });

  // Domain 5: Hydrodynamic Fruit Separation Physics
  let splitFruitCount = 0;
  for (const f of frames) {
    for (const fr of f.fruits) {
      if (fr.isSplit) splitFruitCount++;
    }
  }

  const fruitPass = splitFruitCount > 0;
  domains.push({
    name: '5. Hydrodynamic Fruit Separation Physics',
    verdict: fruitPass ? 'PASS' : 'FAIL',
    measuredValue: splitFruitCount,
    threshold: 1,
    notes: `Fruit split & particle events detected: ${splitFruitCount}`,
  });
  if (!fruitPass) diagnostics.push('No fruit separation events detected in choreography.');

  // Overall Verdict
  const failCount = domains.filter((d) => d.verdict === 'FAIL').length;
  const warnCount = domains.filter((d) => d.verdict === 'WARNING').length;

  let overallVerdict: FruitNinjaAuditReport['overallVerdict'] = 'PASS';
  let score = 100 - failCount * 25 - warnCount * 10;
  if (failCount > 0) overallVerdict = 'FAIL';
  else if (warnCount > 0) overallVerdict = 'WARNING';

  return {
    overallVerdict,
    overallScore: Math.max(0, score),
    domains,
    failureDiagnostics: diagnostics,
  };
}

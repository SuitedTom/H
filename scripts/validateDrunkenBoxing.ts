import { buildCanonicalDrunkenBoxingFrames } from '../src/lib/drunkenBoxing/drunkenGenerator';
import { validateDrunkenBoxingBiomechanics } from '../src/lib/drunkenBoxing/drunkenAudit';

export function runDrunkenBoxingAudit(): boolean {
  console.log('\n================================================================');
  console.log('RUNNING DRUNKEN BOXING / ZUI QUAN MASTER 480-FRAME AUDIT SUITE');
  console.log('================================================================\n');

  const frames = buildCanonicalDrunkenBoxingFrames({
    projectName: 'drunken_boxing',
    targetFps: 24,
    groundY: 755.0,
    manColorHex: '#0F172A',
    scale: 0.5,
  });

  console.log(`Generated ${frames.length} frames at 24 FPS (~20.0 seconds)`);

  const audit = validateDrunkenBoxingBiomechanics(frames, 755.0, 0.5);

  console.log('\n--- 7-DOMAIN BIOMECHANICAL AUDIT RESULTS & MEASUREMENTS ---');
  for (const item of audit.items) {
    const icon = item.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${icon}] ${item.label}`);
    console.log(`       Measured: ${item.metric} | Required: ${item.threshold}`);
    if (!item.passed) {
      console.error(`       FAILED CHECK: ${item.id} - ${item.detail}`);
    }
  }

  console.log('\n--- MANDATORY CONTACT EVENTS (12 TARGETS) ---');
  for (const c of audit.contactReports) {
    const icon = c.passed ? '✓' : '✗';
    console.log(
      `[${icon}] Frame F${c.frame.toString().padStart(3, '0')}: ${c.strikeName} -> ${c.targetName} (${c.targetX}, ${c.targetY}) | eff: (${c.effectorX.toFixed(1)}, ${c.effectorY.toFixed(1)}) dist: ${c.distancePx.toFixed(2)}px flex: ${c.jointFlexionDeg.toFixed(1)}°`
    );
  }

  console.log('\n--- STRIKE SPEED ACCELERATION RATIOS ---');
  for (const s of audit.strikeSpeedReports) {
    const icon = s.passed ? '✓' : '✗';
    console.log(
      `[${icon}] Frame F${s.contactFrame.toString().padStart(3, '0')}: ${s.strikeName} | Peak Speed: ${s.peakEffectorSpeed.toFixed(1)} px/f vs Stumble Avg: ${s.precedingStumbleAvgSpeed.toFixed(1)} px/f -> Ratio: ${s.ratio.toFixed(2)}x`
    );
  }

  console.log(`\nOverall Result: ${audit.passedChecks}/${audit.totalChecks} domain checks passed.`);
  if (!audit.passed) {
    console.error('FATAL: Drunken Boxing biomechanical validation failed!');
    return false;
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runDrunkenBoxingAudit();
  if (!success) {
    process.exit(1);
  }
}

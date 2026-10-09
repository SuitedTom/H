# Unified Action-Aware Animation Quality Change

## What this one change integrates

This change extends the existing `src/motion` keyframe/intent pipeline and `skills/validation/AnimationQualityAnalyzer.ts`; it does not add a duplicate pose system.

- Corrects the 17-node anatomical map: neck/head are nodes 12/13, and the left arm is nodes 14/15/16.
- Corrects center-of-mass segment weights to match that node order.
- Re-applies bounded joint constraints and planted-foot/ground constraints after breathing, follow-through, and animate-on-twos processing.
- Adds eight audit domains to the existing analyzer: structural, kinematic, biomechanical, contacts, visual-freeze proxy, posture, action mechanics, and continuity.
- Audits run elbow flexion/forward lean, target-aware punch reach when a target is supplied, angular/root jumps, acceleration proxies, foot drift, ground penetration, CoM behavior, and accidental frozen holds.
- Attaches the report to each track compiled by the existing intent parser.
- Expands existing canonical presets for left-side run drive/flight, high/low blocks, backward falling, and landing compression.
- Adds an integrated regression command and CI coverage.

## Mapping to the 25 concerns

Body mechanics/posture/joints/balance are addressed through anatomical constraints, posture metrics, center-of-mass checks, and continuity diagnostics. Timing/spacing, arcs, momentum, and transitions receive root/angular change and acceleration proxies while retaining the existing easing and follow-through pipeline. Footwork and contact are re-projected after secondary motion and measured by ground penetration and planted-foot drift. Action-specific formations are expanded and run/punch target checks are available. Recovery and whole-body continuity receive sequence diagnostics and a per-track quality report.

The visual-freeze detector is only a proxy: silhouette readability, actual weapon grip, blade intersections, expressive exaggeration, and final rendered motion still require visual inspection.

## Verification

CI is configured to run `npm run test:quality` alongside existing motion/locomotion/pose tests, lint, and build. This work should only be called verified after GitHub Actions reports success.

## Limitations

- Numeric metrics do not replace human judgement of silhouette, action clarity, and timing.
- This is not a full rigid-body force simulator or motion-capture retargeter.
- The quality report flags measurable risks; it does not automatically fix every stylistic defect.

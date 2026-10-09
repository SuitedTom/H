# Locomotion Dynamics Integration (Duplicate-Aware)

## Repository audit and reuse decisions

This change deliberately extends the existing `src/lib/motion/contactAwareLocomotion.ts` generator instead of creating a second locomotion implementation. It reuses:
- `solveTwoBoneIK` and `solveForwardKinematics17` for the same 17-bone rig;
- `calculateWeightedCenterOfMass` and `evaluateDynamicBalance` from `src/lib/physics/dynamicBalanceSolver.ts`;
- `computeBaseOfSupport` from `src/lib/physics/contactSupportEngine.ts`;
- the existing foot stance/swing target model and locomotion test command.

The repository already contains balance recovery, pelvis/gait guidance, acceleration/deceleration principles, and a general physics scenario named `CONTROLLED_IMBALANCE_RECOVERY`. Therefore this change does not add another balance solver or another walk/run module. It connects the existing concepts to the reusable contact-aware gait generator.

## New integration capabilities

### Walk and run profiles

`generateContactAwareLocomotion` accepts `mode: 'walk' | 'run'`. Mode-specific defaults tune cadence, stride length, stance fraction, swing clearance, and arm swing. Both modes share the same contact scheduler and IK solve.

### Acceleration and deceleration

The generator accepts an acceleration profile, ramp durations, and initial/final speed fractions. Horizontal root travel and gait phase advance use the same speed profile so contact timing follows progression instead of running at an unrelated constant phase rate. The output reports horizontal root velocity and acceleration per frame.

### Pelvis bob

A configurable, periodic pelvis vertical offset adds gait-linked vertical motion. Set `pelvisBobPx: 0` to disable it for tests or deliberately rigid motion.

### Existing balance-system integration

Each frame evaluates the generated pose with the existing weighted CoM, base-of-support, and extrapolated-CoM balance routines. When enabled, it applies bounded torso/chest counter-lean and a small arm counterbalance for the strategies already returned by that solver. Per-frame results expose stability margin, recommendation, applied correction, and CoM; the report aggregates unstable frames and correction counts.

## Verification

Run:
- `npm run test:locomotion`
- `npm run test:motion`
- `npm run lint`
- `npm run build`

Regression coverage now includes the existing walk/contact checks plus run-mode output, acceleration and deceleration settings, velocity/acceleration finiteness, pelvis bob, dynamic-balance output, and disabling bob/recovery. The remote GitHub file-writing interface cannot execute npm commands, so test status must come from CI or a local checkout.

## Known limitations

- The existing balance solver is a simplified 2D stability heuristic; this integration does not claim a full rigid-body or force simulation.
- Counter-lean changes upper-body angles after the leg IK pass. If a correction materially changes CoM, foot targets are measured and reported but the entire pose is not iteratively re-solved against a balance/contact optimization objective.
- The existing support calculation infers support from feet near the ground; gait phase metadata is not yet fed into its support-point force distribution.
- Pelvis bob is periodic and not yet tuned from captured reference motion.
- The generator is a reusable engine module; user-facing UI and native `.stknds` export integration remain separate tasks.

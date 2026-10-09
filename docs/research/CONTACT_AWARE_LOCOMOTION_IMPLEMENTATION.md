# Contact-Aware Locomotion and Inverse Kinematics

## Overview

`src/lib/motion/contactAwareLocomotion.ts` adds a standalone procedural gait generator on top of the existing 17-bone skeleton and analytical two-bone IK. It does not replace the existing kinematics solver.

## Frame generation

For each frame, the generator:
1. Advances the pelvis root at a configurable speed derived from stride length and cycle duration.
2. Schedules right and left feet half a cycle apart.
3. Holds each stance toe target fixed in world coordinates.
4. Moves swing toes along a sinusoidal clearance arc toward the next landing point.
5. Converts the toe target to an ankle target using foot-segment length and orientation.
6. Solves thigh and shin world angles with the existing `solveTwoBoneIK` implementation.
7. Adds opposing arm swing and emits phase/contact metadata for downstream preview and auditing.

The foot segment indices are 3 (right) and 6 (left); leg joint indices are 1–3 and 4–6. All generated frames retain the 17-angle format used by the motion core.

## API

`generateContactAwareLocomotion(options)` accepts:
- `frameCount`, `cycleFrames`, `strideLengthPx`
- `stanceFraction`, `swingHeightPx`
- `groundY`, `scale`, `startX`, optional `startY`
- `direction: 'right' | 'left'`
- optional `baseAngles`, `armSwingDeg`, and `plantedFootTolerancePx`

It returns generated frames, per-foot stance/swing labels and toe targets, target residuals, and a report containing planted-foot drift, ground penetration, and IK reachability diagnostics.

## Verification

Run:
- `npm run test:locomotion`
- `npm run test:motion`
- `npm run lint`
- `npm run build`

The dedicated regression test checks both gait phases, fixed stance targets, contact drift, ground clearance, direction reversal, and invalid options. The repository's GitHub Actions workflow is configured to run this suite. Test success is not claimed until the workflow actually reports success.

## Scope and known limitations

- This is kinematic 2D gait, not a full muscle/force dynamics simulation.
- Foot targets are world-space constraints; when an authored root trajectory places them outside the limb's reach, the existing IK solver clamps the solution and the report surfaces reachability/residual problems rather than promising exact contact.
- The current implementation uses a simple fixed pelvis height and sinusoidal swing clearance. It does not yet add vertical pelvis bob, dynamic balance recovery, terrain adaptation, toe roll, or stride retargeting.
- Arm swing is a lightweight angular overlay on the supplied/default world-angle pose.
- Integrating the generator into a user-facing animation workflow and the native `.stknds` exporter is a separate follow-up.

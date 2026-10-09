# Joint-Aware Full-Body Animation Skill

## Purpose

Coordinate a connected 2D stick figure as a kinetic chain rather than as unrelated points. Use the repository's existing skeleton, forward-kinematics, IK, FrameState, spatial-consistency, and biomechanics abstractions wherever possible. Do not introduce a parallel skeleton model without proving the existing one cannot represent the need.

## Evidence and provenance

The core principles are consistent with:
- Alan Becker, [Stick Figure Animation (revamped)](https://www.youtube.com/watch?v=mViKZJQcbpM) — stick-figure workflow (transcript page located; full archive not verified).
- National Film Board of Canada, [The 12 principles of animation](https://blog.nfb.ca/blog/2015/03/20/12-principles-animation/), especially arcs, timing, pose-to-pose, and follow-through/overlap.
- Clip Studio Paint, [12 Principles of Animation](https://www.clipstudio.net/en/animation/12-principles/), especially separately controlled layers and overlapping action.

This document translates those principles into repository-level engineering rules; it does not claim that these creators prescribe this code architecture.

## Kinetic-chain model

Use the actual project skeleton and node definitions. A conceptual chain is:

`root → pelvis → torso → shoulder → elbow → wrist/hand`

and

`pelvis → hip → knee → ankle → foot`

A head/neck chain and the opposite limbs connect through the torso/pelvis as supported by the actual skeleton. This is a conceptual dependency map, not a declaration of Stick Nodes' native binary structure.

## Rules

1. **Respect hierarchy.** A child segment's world pose depends on its parent chain. Apply local rotations and forward-kinematics propagation consistently.
2. **Preserve lengths unless deformation is explicit.** If a bone is represented by endpoints, compare its length against the configured/reference length within a documented tolerance.
3. **Solve goals with constraints.** For reach and foot placement, prefer existing IK or constrained solvers over moving each joint independently.
4. **Use angle-aware interpolation.** Interpolate rotations on the shortest intended angular path unless the action deliberately performs a full rotation.
5. **Coordinate the torso and limbs.** A strike, jump, turn, or run should specify root/pelvis intent and limb goals together.
6. **Respect bend polarity and limits.** Knees and elbows should not flip unpredictably between equivalent IK solutions.
7. **Separate root motion from articulation.** Root translation, pelvis rotation, and local joint motion are distinct controls.
8. **Allow stylized exceptions explicitly.** Squash/stretch, deliberate joint breaks, or impossible poses may be used as a marked artistic mode, not as silent solver failure.
9. **Apply secondary motion after primary pose solving.** Overlap must not invalidate hard contacts or segment constraints.
10. **Revalidate after effects.** Any post-processing that moves a joint must trigger connectivity/contact checks.

## Full-body action planning

For a significant action, define:
- Root translation and orientation.
- Pelvis trajectory and rotation.
- Torso lean/twist.
- Support limb(s) and contact state.
- Primary limb target(s).
- Head orientation/lag if needed.
- Secondary motion policy.
- Entry and exit pose constraints.

Examples:
- **Punch:** support foot → pelvis/torso rotation → shoulder → elbow extension → hand target → target reaction → recovery.
- **Jump:** crouch/anticipation → forceful extension → toe-off/contact release → airborne pose → landing preparation → impact absorption.
- **Run:** cyclic support exchange, pelvis bounce/rotation, alternating leg swing, coordinated arm counter-swing.
- **Flight acceleration:** establish take-off cause, transition from ground support to airborne motion, then coordinate torso lean and limb drag with the acceleration profile.

These are planning templates; timing and exact joint order must be tuned to the intended style and the character's design.

## Validation metrics

Where the code can measure them, record:
- Bone-length deviation per segment and maximum deviation.
- Joint-angle discontinuity between adjacent frames.
- Unintended joint flips.
- Foot target error during planted contact.
- Hand target error during intentional reach/contact.
- Root and pelvis velocity discontinuities.
- Invalid numeric values.
- Contact state transitions that lack an explicit release/impact event.

Use existing repository tolerances when they are documented and appropriate. Do not introduce conflicting universal pixel thresholds; normalize tolerance to character scale where possible.

## Review checklist

- Does the body remain connected throughout the timeline?
- Does the torso support the action rather than float independently?
- Are knees and elbows bending in the intended direction?
- Do planted feet stay planted until release?
- Does the root/pelvis move coherently with the support base?
- Do hands reach their intended targets without unexplained stretching?
- Are deliberate stylizations documented?
- Are secondary motions applied without breaking primary constraints?

## Integration guidance

Before implementing new code, inspect `src/lib/skills/kinematicsSolvers.ts`, `src/lib/skills/forwardKinematics.ts`, `src/lib/physics/groundPerimeterSystem.ts`, and existing audit utilities referenced by `docs/AUDIT.md`. Extend and test those abstractions instead of adding duplicate solvers.

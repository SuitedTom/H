# Procedural Motion Core: Implementation and Verification

## Why this change

The repository audit identified sparse-intent expansion and generalized timing/easing as prose-only capabilities. Existing FK and two-bone IK code already provide a foundation, so this implementation adds a small composable layer rather than replacing those solvers or rewriting existing animation generators.

## Added runtime APIs

### `src/lib/motion/proceduralMotion.ts`

- `SparseMotionKeyframe`: frame index, root position, 17 world-space joint angles, optional easing, phase label, and planted-foot segment IDs.
- `generateFramesFromKeyframes`: expands strictly ordered sparse keys to a deterministic full-frame sequence.
- `easeMotion`: linear, ease-in, ease-out, ease-in-out, and hold interpolation.
- `normalizeAngleDeltaDeg`: shortest signed angular path with explicit positive-180 handling.
- `getWorldJointPoses`: exposes geometry using the existing FK implementation.

Input validation rejects non-finite values, malformed 17-angle poses, invalid frame ordering, unsupported foot indices, and invalid scale/range options. Keyframe data is copied rather than mutated.

### `src/lib/motion/motionValidator.ts`

Provides a general validation report with measurable values for:
- segment-length deviation against the repository's canonical 17-bone structure,
- maximum adjacent-frame joint-angle change,
- maximum adjacent-frame root displacement,
- drift of feet marked planted in both adjacent frames,
- non-finite coordinates and malformed angle arrays.

Thresholds are configurable and scale-aware for bone-length tolerance. Root/angular thresholds are diagnostic defaults, not universal biomechanical laws; production profiles should tune them by action and frame rate. Contact checking is only meaningful when input keys accurately mark planted-foot intervals.

### `scripts/test-motion-core.ts`

Adds dependency-light regression tests for easing curves, shortest-angle interpolation, sparse expansion, invalid input handling, forward-kinematic segment-length invariance, and validator failure reporting. Run with `npx tsx scripts/test-motion-core.ts`; run `npm run lint` and `npm run build` for project-wide verification.

## Current limits

- This layer accepts already authored sparse world-angle poses; it does not yet compile natural-language intent into poses.
- It does not yet run a full foot-lock IK solve; it measures drift and reports it. Enforcing a planted target requires integrating the contact target into the existing limb IK and respecting reachability.
- It does not claim that smooth interpolation proves physical realism.
- It does not change native `.stknds` serialization, the React preview UI, or existing generated projects.
- Tests have been committed, but remote GitHub write tools cannot execute the project's npm scripts. Test status must be established by CI or a local checkout before claiming they pass.

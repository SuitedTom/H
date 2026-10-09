# Locomotion and Contact Animation Skill

## Purpose

Create walking, running, jumping, and ground-to-air transitions with explicit support, release, and landing events. The skill is reusable across future animation types and should work with existing motion-intent, spatial-consistency, kinematics, and audit systems.

## Evidence and provenance

- TipTut, [How to Animate a Walk Cycle](https://www.youtube.com/watch?v=mCe1xtx-nK4): public chapter markers identify contact, passing, down, up, key-pose arrangement, secondary animation, and follow-through/overlap. Full transcript not verified.
- TipTut course outline: https://www.classcentral.com/course/youtube-how-to-animate-a-walk-cycle-159979
- National Film Board of Canada, [The 12 principles of animation](https://blog.nfb.ca/blog/2015/03/20/12-principles-animation/): pose-to-pose, arcs, timing, and overlap.

## Walk-cycle pose set

Use these as named pose roles; actual frame counts and angles are character- and style-dependent.

1. **Contact A:** leading foot reaches its intended ground location; trailing foot is behind.
2. **Down:** support leg absorbs weight; pelvis lowers.
3. **Passing:** swing leg passes the support leg; body travels over the support base.
4. **Up:** support leg extends and the trailing heel rises.
5. **Contact B:** mirror/alternate the support role for the other side, accounting for intentional asymmetry.

A common teaching sequence describes contact, down, passing, and up. Some tutorials arrange or name the second contact differently; retain source-specific naming in research notes while normalizing the internal representation to explicit events and pose roles.

## Contact-state model

Represent each foot (or other contact point) with a state such as:
- `approaching`
- `planted`
- `releasing`
- `swinging`
- `landing`

Transitions must be deliberate. A planted foot is constrained to its target in world/ground space while the body moves over it, except when the action explicitly slides, pivots, or breaks contact. When a foot releases, its target constraint must be removed or changed so it does not drag the character unnaturally.

For jumps and launches, define:
- anticipation/crouch,
- extension and force application,
- toe-off/contact release,
- airborne transition,
- flight,
- landing preparation,
- impact absorption and recovery (if landing occurs).

Do not treat vertical translation alone as a ground-propelled launch: the pose and contact timeline must communicate the force generation and the exact release of support.

## Foot-lock and ground-plane checks

- Establish the ground plane and character scale.
- Record planted foot target(s) per frame or contact interval.
- Measure foot drift while planted.
- Detect penetration below the ground plane.
- Check whether the foot is visibly planted when the state says it is.
- Release the constraint at toe-off or an explicit pivot/slide event.
- During swing, validate clearance and a readable trajectory.
- At landing, align contact pose and ground plane before impact follow-through.
- Check both the first/last frame seam of cyclic locomotion.

Use existing ground-plane helpers and documented thresholds where possible. Avoid hardcoding one pixel threshold for every figure scale.

## Run cycle differences

A run usually has stronger vertical/root dynamics and may include a flight phase with both feet off the ground. Do not simply speed up a walk cycle:
- Re-plan support and flight phases.
- Adjust stride length and cadence together.
- Revisit pelvis bounce and lean.
- Make arm drive consistent with the intended speed.
- Preserve plausible foot placement at landing and push-off.
- Use the desired style to determine how much airborne time and exaggeration are appropriate.

## Walk-to-run-to-flight transition

1. Walk establishes repeatable foot contacts and stable rhythm.
2. Acceleration increases stride/cadence and changes torso lean progressively.
3. The final support step places the foot to enable the launch.
4. Pelvis and torso compress/prepare, then extend in a coordinated push.
5. The foot remains constrained until toe-off; release is an explicit event.
6. The body transitions from supported to airborne without an unexplained position teleport.
7. Flight pose, limbs, camera, and effects follow the same acceleration intent.
8. If a sonic boom or trail is used, synchronize it to the relevant speed/impact event rather than arbitrary frame numbers.
9. Validate continuity at every phase boundary.

## Acceptance checks

- Foot sliding stays below a character-scale-aware tolerance during planted intervals.
- No unintended ground penetration.
- No unexplained contact-state jumps.
- The root does not teleport between walk, run, and flight.
- The launch has a visible preparation, force application, and release.
- The cyclic walk/run seam has no visible foot or pelvis pop.
- Intermediate frames are inspected, not just the named poses.
- Any physically impossible but stylistically intentional motion is documented.

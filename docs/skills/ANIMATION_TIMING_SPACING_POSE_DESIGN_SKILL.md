# Animation Timing, Spacing, and Pose Design Skill

## Purpose

Create readable motion by planning the important poses first, assigning an action-specific duration, then designing the position and angle distribution between poses. This skill supplements `TEMPORAL_MOTION_TIMING_SKILL.md`, `NATURAL_MOVEMENT_SKILL.md`, and the shared skill in `SKILL.md`; it does not replace them.

## Evidence and provenance

This guidance is synthesized from:
- Alan Becker, [Stick Figure Animation (revamped)](https://www.youtube.com/watch?v=mViKZJQcbpM) — creator-described stick-figure workflow; transcript page located, complete transcript archive not verified.
- TipTut, [How to Animate a Walk Cycle](https://www.youtube.com/watch?v=mCe1xtx-nK4) — video chapter markers for contact, passing, down/up poses, and secondary motion; full transcript not verified.
- National Film Board of Canada, [The 12 principles of animation](https://blog.nfb.ca/blog/2015/03/20/12-principles-animation/).
- Clip Studio Paint, [12 Principles of Animation](https://www.clipstudio.net/en/animation/12-principles/).

These sources support general animation principles. The implementation checks below are engineering recommendations for this repository, not direct quotes from the videos.

## Required workflow

1. **Define intent.** State what changes, why it changes, its direction, target, and expected result.
2. **Block key poses.** Include start, anticipation (when needed), major extreme, contact/release (when relevant), reaction, and recovery/settle.
3. **Validate silhouettes.** Each important pose should communicate the action without requiring intermediate frames.
4. **Assign timing.** Set duration per action phase. Do not assume all phases have equal duration.
5. **Design spacing.** Choose per-frame displacement/angle change according to acceleration, holds, impacts, and deceleration.
6. **Add breakdowns.** Establish arcs, body lean, joint bend direction, and the path between extremes.
7. **Add overlap and secondary action.** Do this after the primary action reads; do not let secondary movement obscure the action.
8. **Review playback.** Inspect the whole action, then scrutinize key and transition frames.
9. **Refine with bounded iterations.** Correct the highest-impact defects first and record what changed.

## Timing vs. spacing

- **Timing** is how long an action or phase takes.
- **Spacing** is the distribution of poses across those frames.
- Equal timing between key poses does not imply equal spatial displacement.
- Linear interpolation is appropriate for some mechanical or sustained movements, but is not a universal default.
- Easing should be chosen by intent: accelerate, decelerate, hold, snap, rebound, or sustain.
- A contact/impact can contain a fast approach and an abrupt velocity change; do not smooth away the impact unless the style calls for softness.

## Pose checklist

For each key pose, inspect:
- Direction of action and readable silhouette.
- Root/pelvis position and orientation.
- Center-of-mass plausibility relative to support/contact.
- Shoulder and hip counter-rotation where appropriate.
- Bend direction of elbows and knees.
- Hand/foot target and contact state.
- Segment lengths and joint connectivity.
- Screen-space readability and camera framing.
- Whether exaggeration is intentional.

## Motion curve guidance

Choose curves per phase, not per animation globally:

| Intent | Expected spacing behavior | Guardrail |
|---|---|---|
| Start from rest | Small initial steps, then larger steps | Avoid long static holds unless motivated |
| Sustained travel | Consistent spacing may work | Preserve gait rhythm and ground contact |
| Quick strike | Increasing speed toward contact, with clear impact transition | Keep target and striking limb aligned |
| Heavy movement | Deliberate anticipation and readable acceleration | Do not confuse slow timing with low force |
| Stop | Decreasing displacement or a deliberate abrupt stop plus body response | Avoid every body part freezing simultaneously |
| Hold | Near-zero root movement with subtle intentional life if appropriate | Prevent random jitter and contact drift |
| Rebound | Reverse direction with a coherent change in velocity | Do not reverse all joints identically by default |

## Acceptance checks

- Key poses are named or otherwise identifiable.
- Action phase durations are explicit or derivable.
- Interpolation does not produce NaN/Infinity or discontinuous joint angles.
- No unintentional jumps in root position or limb lengths.
- Contact frames remain aligned to their targets.
- The first and last frames of a loop are compatible.
- Visual review includes key poses and intermediate frames.
- Any subjective stylistic choice is distinguished from a measurable defect.

## Anti-patterns

- Adding many in-betweens before the main poses are readable.
- Applying one easing curve to every joint and phase.
- Assuming smooth numerical interpolation guarantees good animation.
- Adding shake, particles, or smear effects to hide weak body mechanics.
- Calling a motion physically correct solely because it looks smooth.

## Research traceability

Maintain source metadata in `docs/research/youtube-animation-sources.json` and the overview in `docs/research/YOUTUBE_ANIMATION_TECHNIQUE_RESEARCH.md`. If a transcript has not been verified, do not invent transcript-derived timestamps or quotes.

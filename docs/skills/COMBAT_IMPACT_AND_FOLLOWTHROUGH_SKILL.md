# Combat, Impact, and Follow-Through Animation Skill

## Purpose

Plan readable strikes, dodges, collisions, knockback, and recoveries as cause-and-effect sequences. This skill complements existing `FORCE_REACTION_FOLLOWTHROUGH_SKILL.md`, `MOMENTUM_DYNAMICS_SKILL.md`, `MOTION_INTENT_AND_CAUSALITY_SKILL.md`, and `GENERAL_INTERACTION_SKILL.md`.

## Evidence and provenance

- Alan Becker, [Stick Figure Animation (revamped)](https://www.youtube.com/watch?v=mViKZJQcbpM): stick-figure workflow source; transcript page located, complete archive not verified.
- Alan Becker, [How to Animate a Perfect Fight Scene](https://www.youtube.com/results?search_query=Alan+Becker+How+to+Animate+a+Perfect+Fight+Scene): candidate source. The linked secondary summary (https://youtubesummary.com/summary/5rH6TfPPEds) is not a verified transcript; canonical upload and exact transcript need review.
- National Film Board of Canada, [The 12 principles of animation](https://blog.nfb.ca/blog/2015/03/20/12-principles-animation/): anticipation, staging, arcs, timing, and follow-through/overlap.

Treat detailed choreography recommendations below as implementation synthesis, not as direct quotations from the videos.

## Action phases

For each attack or collision, identify the applicable phases:

1. **Intent/staging:** show target, direction, and action clearly.
2. **Anticipation:** load the movement when the action benefits from preparation.
3. **Acceleration:** coordinate support, root/pelvis, torso, shoulder, and striking limb.
4. **Contact or near-miss:** define the exact target relationship and frame/event.
5. **Reaction:** move the receiving character or object in a way that corresponds to the applied action.
6. **Follow-through/recoil:** allow the kinetic chain and affected body parts to resolve at different rates.
7. **Recovery:** restore balance, guard, or the next meaningful pose.

A feint, light tap, fast stylized strike, or interrupted action may omit or compress phases. Do not force every action into identical timing.

## Strike mechanics

- Define the intended target and contact point before refining the hand/foot trajectory.
- Coordinate root and support foot with pelvis/torso rotation.
- Ensure the elbow/knee bend direction remains stable.
- Preserve segment lengths unless an intentional stylized deformation is requested.
- Make the contact frame readable through pose, spacing, staging, and optionally an impact effect.
- Ensure the target reaction starts at or after the causal contact event, allowing a deliberate anticipation only when narratively justified.
- If the attacker is stopped by impact, represent the resulting velocity change and body response rather than freezing every joint at once.

## Reaction and knockback

The receiving character should react to the contact location and direction. Check:
- initial target alignment,
- displacement and rotation direction,
- support-foot response,
- pelvis and torso response,
- arm/head follow-through,
- balance loss or recovery,
- any subsequent environmental collision.

Do not use a large screen-space translation as the only representation of impact. Articulation and support changes help communicate force. Conversely, do not add arbitrary recoil when the action is a controlled touch or block.

## Follow-through and overlap

Secondary parts can lag, overshoot, or settle after the primary body motion, but:
- use action-specific timing rather than a universal fixed delay,
- do not let overlap break planted contacts or joint connectivity,
- keep the main action's silhouette readable,
- damp or terminate oscillation deliberately,
- avoid random jitter as a substitute for controlled follow-through.

## Visual effects synchronization

If adding smear frames, trails, flashes, impact rings, dust, or camera shake:
- anchor them to the relevant movement/contact event,
- set a deliberate onset and decay,
- preserve visibility of the important contact pose,
- avoid effects that hide a misaligned hit,
- test the effect-free animation as well as the composited result.

## Validation checks

- Target and striking limb meet at the intended contact point.
- Contact/reaction ordering is causally coherent.
- No unintended limb-length change or joint flip occurs.
- The attacker and receiver retain coherent support/balance responses.
- The impact reads in silhouette and playback.
- Follow-through is visible but not noisy.
- Effects are synchronized to events and do not conceal defects.
- The recovery pose plausibly leads into the next action.
- Review at least the anticipation, pre-contact, contact, immediate reaction, and recovery frames.

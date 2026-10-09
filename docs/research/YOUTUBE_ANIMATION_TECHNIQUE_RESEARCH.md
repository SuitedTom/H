# YouTube Animation Technique Research

**Purpose:** Convert animation lessons into reusable, testable guidance for the Stick Nodes Animation Forge. This is a research index and implementation brief, not a claim that every linked video's complete transcript has been downloaded or reviewed.

## Research method and evidence labels

Each source is classified as one of:

- **Transcript verified:** a transcript page or caption text was directly accessible during research.
- **Video metadata verified:** the official video page/description and its chapter markers were available; the complete transcript was not verified.
- **Supporting written source:** an educational article supports the principle, but is not a YouTube transcript.
- **Needs review:** useful candidate; inspect the video/transcript before treating it as direct evidence.

Do not invent transcript text, timestamps, or quotations. Keep notes paraphrased, attribute techniques to their source, and retain timestamps only when supplied by the creator or checked against the transcript. Do not commit full copyrighted transcripts; store concise notes, short permitted excerpts where appropriate, timestamps, and links.

## Source set

### S1 — Alan Becker, “ALAN BECKER - Stick Figure Animation (revamped)”
- Video: https://www.youtube.com/watch?v=mViKZJQcbpM
- Transcript access: https://filmot.com/sidebyside/mViKZJQcbpM/pt/auto.en/Portuguese/English%2B%28auto-generated%29/ALAN%2BBECKER%2B-%2BStick%2BFigure%2BAnimation%2B%28revamped%29/AlanBeckerTutorials
- Evidence: **Video metadata verified; transcript page located.** The creator describes this as their personal stick-figure animation workflow. Transcript availability should be rechecked by future automated collection before claiming the complete transcript is archived.
- Research questions: workflow order; pose planning; frame-by-frame decisions; how motion is reviewed and refined.
- Repository application: pose-first planning, frame review, and a stick-figure-specific reference path.

### S2 — TipTut, “How to Animate a Walk Cycle”
- Video: https://www.youtube.com/watch?v=mCe1xtx-nK4
- Evidence: **Video metadata and chapter markers verified.** Public description lists Contact at 00:47, another Contact at 02:26, Passing at 05:17, Down at 07:14, Up at 09:37, key-pose arrangement at 11:38, and secondary animation/follow-through from 15:27–18:30. Full transcript not verified in this research pass.
- Supporting course outline: https://www.classcentral.com/course/youtube-how-to-animate-a-walk-cycle-159979
- Repository application: locomotion pose definitions, cyclic continuity, secondary motion, and overlap.

### S3 — Alan Becker, “How to Animate a Perfect Fight Scene”
- Video search: https://www.youtube.com/results?search_query=Alan+Becker+How+to+Animate+a+Perfect+Fight+Scene
- Secondary summary: https://youtubesummary.com/summary/5rH6TfPPEds
- Evidence: **Secondary summary only; complete transcript and exact original video URL not verified here.** Do not treat the summary as a verbatim transcript or as proof of specific detailed claims.
- Research questions: action readability, anticipation, attack/reaction timing, impact framing, and choreography.
- Repository application: action phases and cause/effect validation, pending direct source review.

### S4 — National Film Board of Canada, “The 12 principles of animation”
- Article: https://blog.nfb.ca/blog/2015/03/20/12-principles-animation/
- Evidence: **Supporting written source.** Explains anticipation, staging, pose-to-pose vs. straight-ahead, arcs, follow-through/overlap, secondary action, and timing.
- Repository application: use principles as design heuristics, not universal physics laws.

### S5 — Clip Studio Paint, “12 Principles of Animation”
- Article: https://www.clipstudio.net/en/animation/12-principles/
- Evidence: **Supporting written source.** Explains separate-layer control for overlap and the relationship between spacing and apparent speed.
- Repository application: independently time body regions and distinguish timing (duration) from spacing (per-frame displacement).

### S6 — HUE, “Learn the 12 Principles of Animation”
- Article: https://huehd.com/12ps-squash-and-stretch/
- Evidence: **Supporting written source.** Lists the twelve principles and describes them as transferable animation guidance.
- Repository application: preserve artistic principles alongside mechanical constraints.

### S7 — StudioBinder, “The 12 Principles of Animation Explained”
- Transcript page: https://youtubetotranscript.com/transcript?current_language_code=en&v=tYc1yUt0IeA
- YouTube search: https://www.youtube.com/results?search_query=StudioBinder+The+12+Principles+of+Animation+Explained
- Evidence: **Transcript page located; original video identity and transcript completeness should be verified before relying on it as a complete source.**
- Repository application: secondary overview for principle definitions; corroborate with primary/educational sources.

## Cross-source synthesis

The following are implementation recommendations synthesized across the sources above, not quotations or claims that one creator teaches this exact software architecture:

1. **Plan readable poses before polishing transitions.** Key poses expose silhouette, balance, action intent, and contact problems early.
2. **Separate timing from spacing.** Timing is duration; spacing is the distribution of positions/angles over that duration. They must be adjustable independently.
3. **Use arcs for joint-driven movement.** Hands and feet usually trace curved paths when multiple connected segments rotate; do not blindly force every path to be an arc if the action calls for a straight trajectory.
4. **Coordinate the kinetic chain.** Root/pelvis, torso, shoulder, elbow, wrist/hand, and support limbs contribute to a strike or launch. The timing is coordinated, not a generic fixed delay on every part.
5. **Make contact explicit.** Planting, collision, take-off, and landing are events with constraints and release conditions.
6. **Use overlap as a controlled layer.** Secondary motion should support the main action and must not break segment lengths, planted contacts, or silhouette clarity.
7. **Test loops at the seam.** A walk cycle must transition from its last frame back to its first without foot pops, root drift, or discontinuous joint angles.
8. **Keep stylization separate from errors.** Exaggerated angles and timing can be intentional; limb-length drift, broken connectivity, and unintended foot sliding are structural defects.
9. **Validate in playback.** Inspect both key frames and intermediate frames; visually attractive stills do not guarantee coherent motion.
10. **Record provenance and uncertainty.** Each future research note should identify the source, transcript status, timestamps reviewed, extracted principle, and the local test that validates the implementation.

## Repository implementation map

- Timing, spacing, and pose blocking: `docs/skills/ANIMATION_TIMING_SPACING_POSE_DESIGN_SKILL.md`
- Joint-aware full-body coordination: `docs/skills/JOINT_AWARE_FULL_BODY_ANIMATION_SKILL.md`
- Locomotion and contacts: `docs/skills/LOCOMOTION_AND_CONTACT_SKILL.md`
- Combat, impacts, and follow-through: `docs/skills/COMBAT_IMPACT_AND_FOLLOWTHROUGH_SKILL.md`
- Structured source metadata: `docs/research/youtube-animation-sources.json`

## Future transcript-ingestion protocol

1. Resolve the canonical video ID and official video URL.
2. Check creator-provided captions and available public auto-captions; record language and whether captions are manual or automatic when known.
3. Save transcript text only in a local research workspace if allowed by the source/platform terms; do not commit a full transcript corpus.
4. Commit a short source note containing timestamps, paraphrased principles, and links.
5. Mark unavailable, partial, translated, or auto-generated transcripts explicitly.
6. Have a second pass validate extracted guidance against the video and the actual Stick Nodes project format.
7. Convert guidance into code only where a concrete existing abstraction and measurable test can be identified.

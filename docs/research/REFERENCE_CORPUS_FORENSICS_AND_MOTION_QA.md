# Reference Corpus Forensics and Motion QA Integration

This document integrates evidence from SuitedTom/I into the Stick Nodes Animation Forge. The source repository's forensic work is preserved as supplemental research, not treated as a complete decoder or a universal source of truth.

## What is integrated

- A conservative, read-only .stknds container and asset-candidate scanner.
- Format-agnostic reference-landmark metrics for velocity, acceleration, jerk, planted-contact drift, and event-window validation.
- Unit tests for those metrics.
- Structured findings, scene-candidate offsets, repeated-marker probe data, and file hashes from the source audit.

## Evidence rules

1. A valid prefix and successful gzip decompression establish container integrity only; they do not prove the animation is valid in Stick Nodes.
2. A candidate asset is accepted only when a length-prefixed printable name is followed by a supported version marker and a parseable node/polyfill structure. Candidate records may overlap or nest.
3. Asset names are heuristic labels, not proof of visual role, visibility, timeline position, or object identity.
4. Timeline record offsets and repeated byte markers remain hypotheses until validated against decoded frames and native application behavior.
5. Motion metrics require observed landmarks in a consistent stage/world coordinate system. Missing points remain missing; the analysis does not silently invent interpolation.
6. Structural parsing, kinematic checks, biomechanical scoring, rendered visual review, and native-app verification must be reported as separate verification layers.

## Findings that should guide generation

- Discover each rig's actual node hierarchy and semantic landmarks instead of assuming a universal node-index layout.
- Preserve unknown binary fields losslessly until their meaning is demonstrated.
- Derive trajectories and event timing from decoded reference frames when available; do not call hand-authored angle tables reference-derived.
- Model characters, props, backgrounds, camera, effects, and audio as separate but synchronized tracks.
- Treat the earlier walk/run attempt in the source audit as a failed visual baseline, despite passing serialization or IK checks: static upper-body motion, stop-start interpolation, invented poses, and hard-coded knee-branch choices are known risks.
- Add parser coverage tests for files that do not fit the current v334/name-boundary heuristic rather than interpreting zero candidates as an empty project.

## Known limitations

The source audit did not fully decode multi-object timelines, frame timing, layer order, camera movement, object transforms, audio/effect synchronization, or native-app playback. Its corpus findings are a research snapshot dated 2026-10-09, not live claims about every current repository asset. The copied scanner is an inventory aid and must not be represented as a complete .stknds parser.

## Files

- tools/reference_corpus_audit.py — read-only conservative forensic scanner.
- sticknodes/qa/reference_motion.py — format-agnostic reference trajectory and contact metrics.
- tests/test_reference_motion.py — focused unit tests.
- data/reference_corpus_findings.json — structured findings with explicit unknowns.
- data/ani_ending_scene_candidates.json and data/ani_ending_wipp_motion_probe.json — exploratory offsets/probes, not decoded timeline truth.
- data/reference_corpus_hashes.json — audit-time integrity fingerprints.

Source: SuitedTom/I, including its forensic report and motion QA implementation.
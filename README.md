# Stick Nodes Animation Forge — Claude Skill

This package teaches Claude how to create new Stick Nodes `.stknds` animations from a supplied corpus of working projects.

## How to use

Give Claude:

1. this skill package;
2. known-good `.stknds` projects;
3. any `.nodes` assets you want used;
4. a plain-English animation request.

Example: "Make a ball bounce twice, with squash on impact and a short settle. Do not copy any template animation."

Use templates to learn file format, rig structures, and application-compatible serialization—not to copy finished animation sequences.

## Integrated reference-forensics and motion-QA layer

This repository now includes supplemental tooling and evidence from [SuitedTom/I](https://github.com/SuitedTom/I):

- `tools/reference_corpus_audit.py`: conservative read-only container/asset-candidate inventory.
- `sticknodes/qa/reference_motion.py`: landmark velocity, acceleration, jerk, planted-contact drift, and event-window measurements.
- `tests/test_reference_motion.py`: focused unit tests for motion measurements.
- `data/reference_corpus_findings.json`: structured forensic findings and explicit unknowns.
- `data/ani_ending_scene_candidates.json`, `data/ani_ending_wipp_motion_probe.json`: exploratory scene offsets and marker probes.
- `data/reference_corpus_hashes.json`: audit-time file integrity fingerprints.
- `docs/research/REFERENCE_CORPUS_FORENSICS_AND_MOTION_QA.md`: integration notes, limitations, and evidence rules.

## Required evidence discipline

- A parseable file is not proof that it imports, plays, or looks correct in the native Stick Nodes app.
- Asset names and candidate offsets are clues, not verified timeline semantics.
- Preserve unknown binary fields; discover each rig's actual hierarchy rather than assuming universal node indices.
- Use observed reference trajectories when available. Never label invented pose angles as reference-derived.
- Keep character, props, backgrounds, camera, effects, and audio as distinct but synchronized scene tracks.
- Separate structural validation, kinematics/contact metrics, rendered visual review, and native-app verification in reports.
- The source audit found timeline decoding and native visual verification remain incomplete; do not overstate the copied scanner as a full parser.

## Important

The `.stknds` files are reference material, not animations to copy. An apparently valid file can still fail to open or animate the wrong node. Use controlled binary experiments, regression tests, frame-by-frame visual review, and native-app verification.
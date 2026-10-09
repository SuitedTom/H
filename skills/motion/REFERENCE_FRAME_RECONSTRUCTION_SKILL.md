# Reference Frame Reconstruction & Motion Extraction Skill

## Overview

This skill establishes validated methodology for analyzing multi-frame reference animation sequences (such as 100+ frame stickfigure combat/acrobatic animations at 25 FPS) and faithfully reconstructing them into programmatic animation data structures.

## Key Principles & Guidelines

### 1. Frame-by-Frame Sequence Decomposition
- **Temporal Alignment**: Map exact frame delays (`delay-0.04s` = 25 FPS) and maintain non-linear timing profiles (windups, holds, explosive releases, deceleration).
- **Landmark Tracking**: Track head, spine, hip/pelvis, extremities, and prop elements (energy orbs, weapons, hit effects) independently across all frames.

### 2. Multi-Phase Act Structure
Organize long reference sequences into clean Narrative/Movement Acts:
- **Act 1: Energy Gathering / Windup** (Frames 000–023)
- **Act 2: Explosive Launch & Airborne Trajectories** (Frames 024–047)
- **Act 3: High-Impact Reaction & Rapid Re-orientation** (Frames 048–079)
- **Act 4: Controlled Landing & Deceleration Settle** (Frames 080–114)

### 3. Orientation & Full-Body Continuity Rules
- Connected joints must preserve hierarchical FK transformations.
- Limb identities (left vs. right) must be strictly maintained across high-velocity rotation phases.
- Ground contact and root positions must avoid artificial floating or sliding unless intended by airborne trajectories in the reference.

### 4. Verification & QA Standard
- Always compare keyframe overlays and telemetry metrics (CoM, trajectory arcs) against raw reference frame bounds.
- Validate TypeScript data structures using unit tests (`*.test.ts`) and zero-error builds.

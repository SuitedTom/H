# Biomechanical & Architecture Audit: SuitedTom/H (Stick Nodes Animation Forge)

**Date**: 2026-10-09  
**Auditor**: Animation Engineering & Biomechanics System  
**Repository**: SuitedTom/H ("Stick Nodes Animation Forge")

---

## 1. Executive Summary

The repository provides a rich set of reverse-engineered insights into the Stick Nodes v334 binary format (`.stknds`), including node hierarchies, frame chunk layouts, and minimum-change byte mutators. However, the motion generation layer suffers from a severe disconnect between **prose claims** and **actual executable code**:

1. **Hardcoded Frames Masquerading as Procedural Intelligence**:
   The current animations (`speed_vs_strength`, `phantom_shadowbox`, `teleport_ambush`, `sit_stand_kick`) are stored as massive static arrays of pre-baked joint angles and scene coordinates. There is no runtime solver turning high-level human intent into animated poses. When modified, animations easily become robotic, stiff, or floaty.
2. **Duplicated & Disconnected Markdown Skills**:
   Over 14 extensive skill files exist in three separate directories (`/`, `/public/`, `/skills/...`) with differing version tags, contradictory thresholds, and pseudoscientific prose (e.g. quantum wavefunctions, Navier-Stokes fluid equations) that have zero representation in the codebase.
3. **Audit Gates with Inconsistent Thresholds and Hardcoded Passes**:
   Validators often evaluate hardcoded frame numbers (e.g. checking frame 24 specifically for kick impact) rather than running generalized physical verification across arbitrary motions.

---

## 2. Code vs. Prose Matrix

| Capability / Rule | Status | Implementation in Code | Found in Prose / Skills | Analysis |
| :--- | :---: | :--- | :--- | :--- |
| **.stknds Binary Inspection & GZIP Decompression** | **CODE** | `src/lib/stknds/stkndsCore.ts` (`inspectStkndsBuffer`) | `SKILL.md` Section 3 | Fully implemented and working. Correctly reads v334 headers and frame records. |
| **Minimal-Change Binary Serialization** | **CODE** | `src/lib/stknds/*.ts`, `*Exporter.ts` | `SKILL.md` Section 6 | Implemented for specific template mutations (`project6.stknds`, `teleport_ambush`, etc.). |
| **Forward Kinematics (17-node skeleton)** | **CODE** | `src/lib/skills/kinematicsSolvers.ts`, `forwardKinematics.ts` | `NATURAL_MOVEMENT_SKILL.md` Section 1.1 | Working 2D FK propagation using trigonometric angles and bone lengths. |
| **Two-Bone Leg IK (Law of Cosines)** | **PARTIAL** | `solveNaturalLegIK` in `speedVsStrengthIK.ts` | `NATURAL_MOVEMENT_SKILL.md` Section 1.1 | Exists as an isolated helper; lack of unified arm/leg solver with configurable polarity limits. |
| **Angle-Space Interpolation with Easing** | **PROSE** | None (only linear tweening or raw hardcoded frame tables) | `TEMPORAL_MOTION_TIMING_SKILL.md`, `NATURAL_MOVEMENT_SKILL.md` | Poses are interpolated naively or baked into discrete frame specs. |
| **Procedural Intent-to-Frame Expansion** | **PROSE** | None (8 bespoke hardcoded choreographies) | `SKILL.md` Section 16, `NATURAL_MOVEMENT_SKILL.md` Section 3 | No parser or compiler exists to take sparse intent keyframes and expand to full continuous frames. |
| **Kinetic Chain Overlap & Follow-Through** | **PROSE** | Only hardcoded staggered frame angles in bespoke choreographies | `FORCE_REACTION_FOLLOWTHROUGH_SKILL.md`, `MOMENTUM_DYNAMICS_SKILL.md` | No algorithmic phase-lag or damped harmonic follow-through engine. |
| **Natural Asymmetry & Organic Micro-Variation** | **PROSE** | Static hand-tuned degree offsets | `MOTION_VARIATION_AND_NATURAL_ASYMMETRY_SKILL.md` | No algorithmic cycle variation, moving hold breathing, or subtle noise generator. |
| **Ground Plane Clamping** | **PARTIAL** | `src/lib/physics/groundPerimeterSystem.ts` | `SPATIAL_CONSISTENCY_SKILL.md` | Helper functions exist, but are applied ad-hoc in some scripts rather than as an integral motion constraint. |
| **Quantitative Multi-Metric Validator** | **PARTIAL** | `biomechanicalAuditor.ts`, `qualityAudits.ts` | `BIOMECHANICAL_AUDIT_SKILL.md`, `SPATIAL_CONSISTENCY_SKILL.md` | Checks are split across multiple files, often hardcoding specific choreographies rather than general metrics. |
| **Headless Preview Renderer (PNG/GIF)** | **PROSE** | Only client-side interactive HTML5 canvas components (`AppCanvas.tsx`) | `README.md` | Claude has no way to render a headless PNG contact sheet or animated GIF to visually inspect motion. |
| **Reference Motion Retargeting (BVH/2D)** | **PROSE** | None | Mentioned in references | No script or utility to parse motion capture or 2D skeletal clips into 17-node stick poses. |
| **Fluid/Density/Navier-Stokes/Quantum Physics** | **PROSE** | Mock files (`densityFluidEnvironmentSolver.ts`, `quantumPhysicsSolver.ts`) return static strings | `DENSITY_FLUID_FORCES_ENVIRONMENT_SKILL.md`, `QUANTUM_PHYSICS_AND_SKILL_ACQUISITION_SKILL.md` | 100% flowery prose with zero practical animation mechanics. |

---

## 3. Skill Rules Never Enforced by Code

1. **Anti-Freeze Rule**:
   * *Rule*: "No living character may have zero angular variation across all 17 bones for > 6 consecutive frames."
   * *Reality*: Neither `biomechanicalAuditor.ts` nor `qualityAudits.ts` flags freezing in arbitrary sequences; several holds in the corpus remain completely motionless.
2. **Torque-Proportional Postural Compensation ($R^2 \ge 0.85$)**:
   * *Rule*: Linear regression correlation between spine lean angle and object moment arm must exceed $0.85$.
   * *Reality*: `biomechanicalAuditor.ts` only checks a trivial boolean condition (`torsoAngle < 88.0` for a specific held state) without calculating any statistical regression or dynamic torque balance.
3. **Extrapolated Center of Mass (Hof XCoM Margin $\le 25\text{px}$)**:
   * *Rule*: Dynamic balance requires $X_{xcom} = X_{com} + V_{com}/\omega_0$ within base of support.
   * *Reality*: The formula is printed in Markdown, but code only checks static `spec.supportMargin` properties pre-populated in data files.
4. **Bone Length Drift Invariance Across Generations**:
   * *Rule*: Bone lengths must not vary by more than $0.05\text{px}$ ($> 0.1\text{px}$ is FAIL).
   * *Reality*: Because poses in code were stored as angles and forward-kinematically mapped, bone lengths were theoretically constant, but if positions were edited or scaled, no automated validator verified this invariant before export.
5. **Camera vs. Character World Decoupling**:
   * *Rule*: Camera pans/zooms must never displace character world coordinates.
   * *Reality*: Not audited in any automated gate.
6. **Jump Landing Elevation Closure ($|Y_{land} - Y_{takeoff}| \le 1.5\text{px}$)**:
   * *Rule*: Ballistic jump touchdowns must equal takeoff surface elevation.
   * *Reality*: Evaluated only in canned data reports; no general validator checks flight takeoff/touchdown continuity.

---

## 4. Contradictions Between Skill Files

### A. Contact Reach Threshold
* **12.0 px**: `NATURAL_MOVEMENT_SKILL.md` (lines 144, 270) specifies `Physical Contact Threshold: Distance <= 12.0px`. `SKILL.md` (line 515) specifies `contact_threshold: default 12.0px`.
* **15.0 px / 25.0 px**: `BIOMECHANICAL_AUDIT_SKILL.md` (line 66) states `Distance <= 15.0px [FAIL if > 25.0px]`.
* **18.0 px**: `SPATIAL_CONSISTENCY_SKILL.md` (line 91, 118) specifies `Distance <= 18.0 px at clash frame`.
* **24.0 px**: `src/lib/skills/qualityAudits.ts` (line 173) validates with `clashDist <= 24`.
* **Resolution**: Consolidate into `config/physics.json` under `contactThresholdPx: 14.0` (with strict tolerance `12.0px` and warning tolerance `18.0px`).

### B. Quality Gate Naming and Scope
* `SKILL.md` (line 484) & `BIOMECHANICAL_AUDIT_SKILL.md`: Calls it the **"7-Domain Biomechanical Audit"**.
* `SPATIAL_CONSISTENCY_SKILL.md` (line 107): Calls it the **"10-Check Automated Spatial Validation Gate"**.
* `NATURAL_MOVEMENT_SKILL.md` (line 147, 223): Calls it the **"10-Domain Spatial & Biomechanical QC"** and **"Skill #53 Gate"**.
* `qualityAudits.ts` (line 29): Calls it the **"Automated 46-Skill Quality-Control Evaluator"**, returning 10 domain objects.
* **Resolution**: Standardize on a single unified **Comprehensive Biomechanical & Spatial Validator** that reports quantitative metrics across all core categories: Structure, Motion/Jerk, Balance, Ground Contact, Interaction, Ballistics, and Decoupling.

### C. "Never Specify Joint Angles" vs. The Canonical Case Study
* `NATURAL_MOVEMENT_SKILL.md` (line 127) declares: *"An author never specifies low-level joint angles when an action can be solved from physical intent."*
* `NATURAL_MOVEMENT_SKILL.md` (line 334) instructs the author: *"chambering the kicking knee high (Thigh +142°, Shin +48°)"*.
* Codebase reality: All generators operate on raw angles (`[0, thigh, shin, ...]`).
* **Resolution**: Create the Sparse-Keyframe Intent Pipeline (Step 3). Authors specify intent (root trajectory, contact points, foot plants, key gestures). Code's IK and procedural engine solves the low-level joint angles.

### D. The 755px Ground Plane Standard
* `SPATIAL_CONSISTENCY_SKILL.md`, `NATURAL_MOVEMENT_SKILL.md`, and `SKILL.md` present $Y = 755.0\text{px}$ as if it were a universal law of nature in Stick Nodes.
* **Reality**: $755\text{px}$ is simply the ground line used in `project6.stknds`. Other templates use $920\text{px}$ (`ball_bounce`), and the internal studios use $350\text{px}$, $310\text{px}$, and $295\text{px}$.
* **Resolution**: Remove hardcoded 755px as a universal constant in documentation. Move `groundY` to `config/physics.json` as a configurable scene parameter (defaulting to 755.0 for standard template compatibility).

### E. Stance Foot Slip Limits
* `BIOMECHANICAL_AUDIT_SKILL.md`: `max |ΔX| <= 0.5px/frame` [FAIL if > 2.0px].
* `NATURAL_MOVEMENT_SKILL.md`: `slip < 2.0px`.
* `qualityAudits.ts`: `slip <= 1.8px`.
* `biomechanicalAuditor.ts`: `maxFootSlip <= 1.0px`.
* **Resolution**: Centralize in config (`maxStanceFootSlipPx: 1.0`).

### F. File Duplication Across Directories
* 14 markdown files are identically duplicated in `/`, `/public/`, and `/skills/`.
* Changes made to one copy were not mirrored in others, creating divergence.
* **Resolution**: Follow Step 8 to slim down `SKILL.md`, eliminate duplicates, and consolidate references into cleanly structured documentation.

---

## 5. Architectural Action Plan

With this audit established, the implementation proceeds through the 8 mandated steps:
1. `config/physics.json`: Centralize all tunable constants.
2. `src/motion/`: Angle-space core with forward kinematics, two-bone IK, anatomical limits, easing, follow-through, and micro-variation.
3. Sparse-keyframe format (`src/motion/schema.ts`, `parser.ts`, `examples/`): High-level intent compiler.
4. Quantitative validators (`src/motion/validator.ts`): Numeric reports with worst-offending frame diagnostics.
5. Headless preview renderer (`src/motion/previewRenderer.ts`): Generates contact sheet PNG and animated GIF.
6. Robust `.stknds` writer (`src/motion/stkndsWriter.ts`): Verified minimal-change binary synthesis.
7. Reference motion retargeting (`src/motion/retargeter.ts`): 2D BVH / mocap clip projection.
8. Slimmed skills & documentation: Concise `SKILL.md` (<150 lines) pointing to tested code and focused reference guides.

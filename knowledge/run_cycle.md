# Biomechanical Knowledge Base: Run Cycle

## 1. Biomechanical Truth (Running Biomechanics)

Unlike walking (which always maintains at least one foot in ground contact and features double-support), the running gait is characterized by the presence of a **flight phase (float phase)** where neither foot touches the ground (Novacheck, 1998; Cavanagh & Kram, 1989).

### Key Mechanical Distinctions
1. **Phasic Division**:
   - Stance Phase: Decreases from $60\%$ (walk) down to $30\%..35\%$ in jogging and $20\%..22\%$ in sprinting.
   - Flight Phase: Occupies $30\%..40\%$ of the stride duration.
2. **Forward Body Lean**:
   - Forward torso lean scales with acceleration and terminal velocity. Steady jogging: $4^\circ..7^\circ$ forward lean. Sprinting acceleration: $15^\circ..25^\circ$ forward lean. High-speed cruising: $8^\circ..12^\circ$.
   - The lean originates from the ankles and pelvis, not by curling the cervical spine.
3. **Stride Length vs. Velocity Relationship**:
   - Velocity = Stride Length $\times$ Stride Frequency. At speeds below $6\,\text{m/s}$, velocity increases primarily via increasing stride length. At maximum sprint ($>7\,\text{m/s}$), stride frequency plateaus at $4.0..4.8\,\text{Hz}$ and flight distance dominates.
4. **Arm Mechanics**:
   - During running, the elbow joint maintains a flexed angle of $80^\circ..90^\circ$ (reducing the rotational moment of inertia of the arm segment).
   - Glenohumeral excursion increases dramatically: sagittal swing reaches $+60^\circ..+75^\circ$ forward and $-45^\circ..-55^\circ$ rearward.
   - The violent arm swing generates vertical ground reaction force counterbalancing pelvic transverse torque.
5. **Vertical Oscillation & Inverted Spring-Mass Model**:
   - The body behaves as a spring-mass system (Blickhan, 1989). The lowest vertical point ($Y_{\text{min}}$) occurs at midstance (maximum leg spring compression); the highest point ($Y_{\text{max}}$) occurs during mid-flight.

### Quantitative Parameters at 24 FPS
- **Jog / Standard Run**: 14–16 frames per full stride (7–8 frames per step).
  - Stance: 5 frames.
  - Flight: 2–3 frames per step.
- **Fast Run / Sprint**: 10–12 frames per full stride (5–6 frames per step).
  - Stance: 3 frames.
  - Flight: 2–3 frames.

---

## 2. Animator's Craft

- **Williams' Run Breakdown** (*The Animator's Survival Kit*, pp. 176–198):
  1. *Contact / Catch*: Forefoot or midfoot strikes ground ahead of CoM.
  2. *Crouch / Compression*: Knee flexes deeply; torso leans forward; weight is absorbed.
  3. *Push-off / Drive*: Stance leg fully straightens ($0^\circ..5^\circ$ knee); toes drive hard into the ground.
  4. *Flight / Hang*: Both feet airborne; rear leg trails, front knee drives high forward.
- **Arms at Right Angles**: Never animate running with straight arms. Straight arms increase visual weight and read as staggering or falling. Keeping the elbow at $\sim 90^\circ$ makes the silhouette snappy and dynamic.
- **Animating on Twos vs Ones**: Runs at 24 fps look punchiest when key poses (Contact, Drive, Flight) are spaced on twos (12 drawings/sec) with aggressive spacing, or on ones (24 drawings/sec) for fluid motion.

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Elbow Locking**: Constrain Node 10 and Node 15 (forearms) to an interior flexion angle of $85^\circ..95^\circ$ throughout the entire cycle.
2. **Torso & Pelvis Lean**:
   Set base root tilt: `Node 7 (spine)` and `Node 8 (chest)` tilted forward by $8^\circ..12^\circ$ relative to the vertical axis.
3. **Flight Trajectory Solver**:
   When entering the flight phase, the root position follows a true ballistic parabola:
   $$X_{\text{root}}(t) = X_0 + V_x \cdot t$$
   $$Y_{\text{root}}(t) = Y_0 + V_{y0} \cdot t + \frac{1}{2} g t^2$$
   This prevents the "hovering" or "bouncing on an invisible trampoline" defect common in hand-placed keyframes.
4. **Foot Stance Pinning**:
   During the brief 3–5 stance frames, the support foot is clamped to `groundY` with `pinWorldX` constant. Two-bone IK handles the deep knee compression.

---

## 4. Rules for Code & Validators

- `runStrideDurationFrames`: 12–16 frames at 24 fps.
- `flightPhaseRatio`: $0.25..0.40$ of total stride frames.
- `airborneElevationDelta`: Minimum foot clearance $\ge 25\,\text{px}$ during mid-flight.
- `torsoForwardLeanDeg`: $6^\circ..15^\circ$ forward.
- `elbowBendAngleDeg`: $80^\circ..100^\circ$.
- `maxStanceFootSlipPx`: $\le 1.0\,\text{px}$.

---

## 5. Sources & Citations

1. **Novacheck, T. F.** (1998), "The biomechanics of running", *Gait & Posture*, 7(1), 77–95. Reliability Grade: **A** (Definitive clinical treatise on kinematics, kinetics, and flight phase mechanics).
2. **Cavanagh, P. R., & Kram, R.** (1989), "Stride length in distance running: velocity, body dimensions, and added mass effects", *Medicine & Science in Sports & Exercise*, 21(4), 467–479. Reliability Grade: **A** (Empirical stride length and cadence equations across running velocities).
3. **Blickhan, R.** (1989), "The spring-mass model for running and hopping", *Journal of Biomechanics*, 22(11-12), 1217–1227. Reliability Grade: **A** (Physical dynamics of vertical leg stiffness and flight parabolas).
4. **HumanML3D Dataset** (Guo et al., 2022; https://github.com/EricGuo5513/HumanML3D). Reliability Grade: **A** (Large-scale 3D mocap dataset of running, sprinting, and athletic transitions).
5. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 176–210). Reliability Grade: **B** (Classic 3-pose and 4-pose run formulas, flight mechanics, and arm swing geometry).
6. **Howard, J.** (2018), *Mastering 2D Animation: Action and Locomotion Cycles*, Bloomsbury. Reliability Grade: **B** (Run timing charts at 24 fps and common foot-slip failure modes).

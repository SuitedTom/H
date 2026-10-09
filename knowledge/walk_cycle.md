# Biomechanical Knowledge Base: Walk Cycle

## 1. Biomechanical Truth (Human Gait Mechanics)

In clinical biomechanics (Perry & Burnfield, 2010; Winter, 2009), the human walking gait is a continuous cycle of dual inverted pendulums divided into two main phases: **Stance Phase** ($\sim 60\%$ of stride duration) and **Swing Phase** ($\sim 40\%$). A full stride comprises two successive steps (one per leg).

### The Five Biomechanical Sub-phases
1. **Initial Contact (Heel Strike)**: The leading heel contacts the ground with the ankle dorsiflexed at neutral $0^\circ..5^\circ$, knee extended to $\sim 5^\circ$ of flexion, and hip flexed to $\sim 25^\circ..30^\circ$. Pelvis is at its lowest height in the stride. Center of Mass (CoM) is midway between feet.
2. **Loading Response (Down / Weight Absorption)**: The foot rolls down to flat foot. The support knee flexes to $15^\circ..20^\circ$ to absorb shock (quadriceps eccentric contraction). Pelvis drops to its minimum vertical position ($Y_{\text{min}}$).
3. **Midstance (Passing Position)**: The swing leg passes the stance leg. The stance hip and knee extend; the ankle dorsiflexes over the stationary foot. Pelvis rises through horizontal midpoint. Stance knee is extended to $\sim 5^\circ$.
4. **Terminal Stance / Preswing (Up / Heel-off & Push-off)**: Stance heel leaves the ground (heel-off); body rolls over the metatarsal rocker into toe-off. The pelvis reaches its maximum vertical elevation ($Y_{\text{max}}$). CoM accelerates forward and downward.
5. **Initial / Mid Swing**: Swing hip flexes up to $25^\circ..30^\circ$; knee flexes to peak of $60^\circ$ to provide ground clearance ($\sim 20\,\text{mm}$ clearance in adult humans); ankle dorsiflexes to prevent toe drag.

### Spatial and Temporal Quantitative Parameters
- **Cadence & Frame Timings at 24 FPS**:
  - *Slow Walk*: 1.3–1.5 seconds per stride = **32–36 frames** (16–18 frames per step).
  - *Normal Cadence* (100–115 steps/min): 1.0 second per stride = **24 frames** (12 frames per step).
  - *Brisk / Athletic Walk* (125–135 steps/min): 0.67–0.75 seconds per stride = **16–18 frames** (8–9 frames per step).
- **Pelvic Vertical Oscillation**: Sinusoidal wave with a total vertical displacement of $40..50\,\text{mm}$ ($\sim 18..24\,\text{px}$ on standard 0.5 scale). Minimum at Contact/Down, maximum at Midstance/Up.
- **Arm Swing Mechanics**:
  - Exactly contralateral to the legs: when Right Leg reaches forward, Left Arm reaches forward.
  - Glenohumeral range: flexes forward $20^\circ..30^\circ$ and extends backward $-15^\circ..-20^\circ$.
  - Arm swing lags the pelvic rotation by $1..2$ frames at 24 fps (passive mechanical pendulum damped by shoulder musculature).
- **Head & Cranium Stabilization**: The cervical spine actively compensates for the vertical and sagittal pelvic oscillation, maintaining the cranium horizontal within $\pm 2.5^\circ$.

---

## 2. Animator's Craft

- **Williams' 4 Canonical Poses** (*The Animator's Survival Kit*, pp. 102–120):
  1. *Contact* (Heel-strike forward, toe-off back; CoM split; lowest pelvis).
  2. *Down* (Recoil / cushion; knee flexes; weight caught; head dips).
  3. *Passing* (One leg carries entire weight; swing knee lifts forward; pelvis rises; arms at sides).
  4. *Up* (Push-off on toe; maximum height; stretched silhouette).
- **Spacing and Weight**: Beginners make walks float by animating linear vertical translation. Professionals use sinusoidal arcs: fast descent into the down pose, sharp cushion, and smooth arc up over the passing point.
- **Foot Roll Progression**: A rigid foot creates robotic "clomping". Animators break the foot contact into 3 distinct pivot points:
  1. *Heel Rocker* (Contact to Down: pivot at heel tip).
  2. *Ankle Rocker* (Down to Passing: flat foot stationary on ground).
  3. *Forefoot/Toe Rocker* (Passing to Up: pivot at ball of foot, heel lifted).

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Shared Phase Variable (`stridePhase`)**:
   Instead of manually positioning 17 nodes every frame, drive all limbs from one authoritative cyclical phase variable $\phi \in [0, 1)$:
   $$\text{Right Leg Phase} = \phi, \quad \text{Left Leg Phase} = (\phi + 0.5) \pmod 1$$
2. **Root Pelvis Sinusoid**:
   $$Y_{\text{root}}(\phi) = Y_{\text{ground}} - H_{\text{standing}} + A_y \cdot \cos(4\pi \phi)$$
   (Oscillates twice per full stride cycle; amplitude $A_y \approx 10..12\,\text{px}$).
3. **Stance Foot Ground Lock**:
   During the stance phase ($\phi \in [0, 0.6]$), the planted foot's world X position is locked:
   $$\text{plantWorldX} = \text{const}$$
   The root advances continuously via horizontal velocity $V_x$, and the stance leg's hip/knee angles are solved via two-bone IK. This guarantees **zero foot slip**.
4. **Swing Foot Clearance Arc**:
   During swing phase ($\phi \in (0.6, 1.0)$), the swing foot lifts along a parabolic trajectory with peak vertical clearance of $20\,\text{px}$ before touching down at $\phi = 1.0$.

---

## 4. Rules for Code & Validators

- `strideDurationFrames`: 24 frames for standard walk; 48 frames for 2 full cycles.
- `maxStanceFootSlipPx`: $\le 1.0\,\text{px}$ during stance phase.
- `maxGroundElevationErrorPx`: $\le 0.5\,\text{px}$ (no sinking below ground).
- `rootStepMaxPx`: $V_x \cdot \Delta t \le 12.0\,\text{px}/\text{frame}$ at 24 fps.
- `pelvisVerticalAmplitudePx`: $8.0..14.0\,\text{px}$.
- `contralateralArmPhaseDelta`: $0.5 \pm 0.05$ (180° counter-phase with $1..2$ frame inertial lag).

---

## 5. Sources & Citations

1. **Perry, J., & Burnfield, J. M.** (2010), *Gait Analysis: Normal and Pathological Function* (2nd ed.), SLACK Inc. Reliability Grade: **A** (Defines the 8 gait phases, joint angle trajectories, and vertical CoM oscillation).
2. **Winter, D. A.** (2009), *Biomechanics and Motor Control of Human Movement* (4th ed.), John Wiley & Sons. Reliability Grade: **A** (Ground reaction forces, energy conservation, and stance/swing phase timing ratios).
3. **CMU Graphics Lab Motion Capture Database** (Subject 02, Walk trials 01–04; http://mocap.cs.cmu.edu). Reliability Grade: **A** (Open 3D/2D kinematic reference curves for root displacement and cadence).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 102–145). Reliability Grade: **B** (Contact, Down, Passing, Up breakdown; arm swing timing; weight distribution).
5. **Blair, P.** (1994), *Cartoon Animation*, Walter Foster Publishing. Reliability Grade: **B** (Classic animation walk cycle timing on ones and twos).
6. **Alan Becker Tutorials** (2017), "12 Principles of Animation: Walk Cycles" (https://www.youtube.com/watch?v=2y6aVz0Acx0). Reliability Grade: **B** (Detailed video breakdown of foot roll mechanics and common beginner floating errors).

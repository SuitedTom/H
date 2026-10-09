# Biomechanical Knowledge Base: Overlap, Follow-Through & Drag

## 1. Biomechanical Truth (Kinematic Chains & Proximal-to-Distal Sequencing)

In sports biomechanics and multi-segment dynamics (Zajac, 1993; Feltner & Dapena, 1986; Putnam, 1993), energetic human movement does not occur simultaneously across all joints. Instead, power generation and deceleration obey the **Principle of Proximal-to-Distal Sequencing**:

### The Kinetic Chain Sequence
1. **Force Generation**: Massive proximal segments (pelvis, lumbar spine) accelerate first. As proximal muscles contract, kinetic energy and angular momentum are transferred sequentially outward along the anatomical chain:
   $$\text{Ground} \to \text{Foot} \to \text{Knee} \to \text{Hip} \to \text{Pelvis} \to \text{Spine} \to \text{Shoulder} \to \text{Elbow} \to \text{Wrist} \to \text{Fingers}$$
2. **Inertial Phase Lag (Drag)**:
   Because distal segments have their own mass and inertia, they resist acceleration when the proximal segment moves. When the upper arm moves forward, the forearm and hand lag behind (drag) until joint ligaments and antagonist muscles transfer torque.
3. **Deceleration & Follow-Through (Whip Effect)**:
   When the proximal segment rapidly decelerates, conservation of angular momentum causes the distal segment to whip forward at high velocity. After the main impulse ceases, distal segments overshoot their equilibrium position and oscillate (damped harmonic oscillation) before coming to rest.

### Temporal Phase Lag Calibration at 24 FPS
Empirical mocap and kinematic tracking reveal precise frame offsets down the human arm and torso chain:
- **Pelvis / Core (Driver)**: Frame $0$.
- **Lower Spine (Node 7)**: $+0.5..1.0$ frames lag.
- **Chest / Ribcage (Node 8)**: $+1.0..1.5$ frames lag.
- **Bicep / Shoulder (Nodes 9, 14)**: $+1.5..2.0$ frames lag.
- **Forearm / Elbow (Nodes 10, 15)**: $+2.5..3.5$ frames lag.
- **Hand / Wrist (Nodes 11, 16)**: $+3.5..5.0$ frames lag.
- **Head (Nodes 12, 13)**: $+1.0..2.0$ frames lag (damped by cervical musculature to maintain horizontal gaze).

---

## 2. Animator's Craft

- **Overlapping Action & Follow-Through** (*The Illusion of Life*, pp. 53–59):
  "Things don't come to a stop all at once; when the main body of the character stops, the other parts continue."
- **Breaking the Joints (No Uniform Start/Stop)**:
  If a character turns their torso and their arms, head, and spine start on frame 1 and stop on frame 10 simultaneously, the character looks like a solid wooden toy. Animators deliberately offset keyframe poses by 1–3 frames for each progressive limb segment.
- **Successive Breaking of Joints**:
  As the arm swings forward, the elbow leads while the wrist drags back. At the end of the swing, the elbow stops first, then the forearm extends, and finally the wrist flicks forward in follow-through.

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Automated Follow-Through Filter (`applyFollowThroughLag`)**:
   Implement a post-interpolation pass over the full motion buffer that applies time-delay sampling down the parent-child hierarchy:
   $$\theta_i(t) = \theta_i(t - \Delta t_i)$$
   Where delay $\Delta t_i = \text{chainDepth}_i \times 0.75\,\text{frames}$.
2. **Harmonic Settle Overshoot**:
   On sudden stops, apply an underdamped spring equation to distal nodes (wrists, head):
   $$\theta_{\text{settle}}(t) = \theta_{\text{target}} + A \cdot e^{-\zeta \omega_n t} \cdot \sin(\omega_d t)$$
   Where damping ratio $\zeta \approx 0.65$ ensures 1 slight overshoot followed by smooth settle.

---

## 4. Rules for Code & Validators

- `chainPhaseLagPerDepthFrames`: $0.5..1.0$ frames per hierarchy level.
- `simultaneousStopTolerance`: In athletic movements, no more than $40\%$ of active joints may reach absolute zero velocity ($\dot{\theta} = 0$) on the exact same frame.
- `wristFollowThroughOvershootDeg`: $5^\circ..15^\circ$ overshoot past target resting angle on rapid arm stops.

---

## 5. Sources & Citations

1. **Zajac, F. E.** (1993), "Muscle coordination of movement: a perspective", *Journal of Biomechanics*, 26, 109–124. Reliability Grade: **A** (Dynamics of multi-joint motor control and proximal-to-distal torque transfer).
2. **Putnam, C. A.** (1993), "Sequential motions of body segments in striking and throwing skills: descriptions and explanations", *Journal of Biomechanics*, 26, 125–135. Reliability Grade: **A** (Mathematical analysis of angular velocity peaks from trunk to distal hand).
3. **Thomas, F., & Johnston, O.** (1981), *Disney Animation: The Illusion of Life*, Abbeville Press (pp. 53–62). Reliability Grade: **B** (Classic definition of Overlapping Action, Drag, and Follow-Through).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 226–245). Reliability Grade: **B** (Successive breaking of joints, flexibility, and arm whipping).
5. **HumanML3D Dataset** (Guo et al., 2022). Reliability Grade: **A** (Mocap trajectories validating joint velocity phase offsets during throwing, punching, and gesturing).

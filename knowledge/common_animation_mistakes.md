# Biomechanical Knowledge Base: Common Animation Mistakes & Automated Fixes

## 1. Catalog of Common Motion Glitches

In 2D stick figure animation and computer-generated character motion, four critical failure modes recur constantly when motion logic is hand-placed without biomechanical constraints:

---

### Failure Mode 1: Floaty Jumps & Moon Gravity
- **Symptom**: The character rises and falls at a constant linear speed, hovers arbitrarily in the air, or touches down without flexing their knees or hips.
- **Physical Cause**: Ignoring gravitational acceleration ($g = 9.8\,\text{m/s}^2$) and Newton's laws of ballistic motion. Placing root $Y$ using linear easing creates uniform vertical velocity ($V_y = \text{const}$).
- **The Code Fix**:
  Calculate vertical root position using true numerical integration of gravity:
  $$Y(t) = Y_0 - V_{y0} t + \frac{1}{2} g t^2$$
  Enforce landing compression: require at least $25\,\text{px}$ of pelvic downward travel absorbed by knee and hip flexion over 4–6 frames before returning to standing height.

---

### Failure Mode 2: Foot Sliding (Moonwalking / Ice Skating)
- **Symptom**: During walks, runs, and combat stances, the support foot crawls or drifts horizontally across the ground while ostensibly bearing the character's weight.
- **Physical Cause**: Root position and foot position are animated independently or interpolated across world space without contact locking.
- **The Code Fix**:
  Implement **Contact Pinning with Two-Bone Inverse Kinematics**:
  1. On foot strike, record the exact world coordinate: $\text{plantWorldX} = \mathbf{P}_{\text{foot}}.\text{x}$.
  2. While the contact state is `PLANT`, lock $\mathbf{P}_{\text{foot}}.\text{x} \equiv \text{plantWorldX}$.
  3. Drive the root forward freely via $V_x$; solve hip and knee angles procedurally via two-bone IK relative to the stationary planted foot.
  4. Measure and reject any animation sequence where stance foot slip exceeds $1.0\,\text{px}$.

---

### Failure Mode 3: Mannequin Stiffness (Toy Soldier Syndrome)
- **Symptom**: Limbs move like stiff hinged sticks attached to an immovable wooden block. Pelvis does not tilt, spine does not flex, and shoulders remain static.
- **Physical Cause**: Animating limbs in isolation without whole-body reactions and lack of weight transfer.
- **The Code Fix**:
  - **Pelvic Driver Rule**: Every major gesture must be initiated at the pelvis and spine.
  - **Contrapposto & Counter-Rotation**: In locomotion, shoulders rotate contralateral to the pelvis.
  - **Spine Curvature Distribution**: Distribute trunk flexion smoothly across lumbar Node 7 and thoracic Node 8 ($|\theta_8 - \theta_7| \le 35^\circ$).
  - **Moving Holds & Breathing**: Apply subtle sinusoidal noise ($0.2..0.5\,\text{px/frame}$) during holds so the character never registers as frozen.

---

### Failure Mode 4: Pop & Flip Glitches (Knee Inversion & Angle Wrapping)
- **Symptom**: A knee or elbow suddenly inverts backward (flamingo knee) or an arm takes a jarring $350^\circ$ windmill spin between two adjacent frames.
- **Physical Cause**:
  1. IK solver ambiguity: Inverting knee polarity because the numerical solver lacks an anatomical polarity constraint.
  2. Euler angle wrap discontinuity: Interpolating directly between $+175^\circ$ and $-175^\circ$ via linear interpolation, traveling $350^\circ$ instead of the true $10^\circ$ shortest arc.
- **The Code Fix**:
  - **Anatomical Knee/Elbow Polarity Clamp**: Force knee flexion interior angle $\beta \in [0^\circ, 155^\circ]$. When facing right, enforce $\theta_{\text{shin}} \ge \theta_{\text{thigh}} - 1^\circ$.
  - **Shortest-Arc Unwrapping**:
    $$\Delta \theta = ((\theta_{\text{target}} - \theta_{\text{start}} + 180^\circ) \pmod{360^\circ}) - 180^\circ$$
    Interpolate along $\theta_{\text{start}} + \Delta \theta \cdot t$.
  - **Jerk Validator**: Flag any frame where joint angular delta $|\dot{\theta}| > 35^\circ/\text{frame}$ at 24 fps.

---

## 2. Summary Validation Table

| Metric Checked | Passing Threshold | Physical Purpose |
| :--- | :--- | :--- |
| **Bone-length Drift** | $\le 0.1\,\text{px}$ | Constant rigid bone lengths; eliminates rubber-hose distortion |
| **Stance Foot Slip** | $\le 1.0\,\text{px}$ | Contact locking; prevents moonwalking and skating |
| **Ground Elevation Error** | $\le 0.5\,\text{px}$ | Prevents feet from sinking through the floor |
| **Root Teleport Spike** | $\le 45.0\,\text{px/frame}$ | Prevents single-frame position jumps |
| **Velocity / Jerk Spikes** | $\le 35.0^\circ/\text{frame}$ | Prevents popping, sudden flips, and infinite acceleration |
| **Strike Contact Reach** | $\le 18.0\,\text{px}$ | Ensures attacks make visible physical contact with targets |
| **Jump Landing Match** | $\le 2.0\,\text{px}$ | Ensures character lands on the takeoff plane |

---

## 3. Sources & Citations

1. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 35–45, 84–98, 226–240). Reliability Grade: **B** (Classic documentation of pop glitches, floaty jumps, and spacing errors).
2. **Alan Becker Tutorials** (2017), "12 Principles of Animation: Common Mistakes and How to Avoid Them" (https://www.youtube.com/watch?v=uDqjIdI4bF4). Reliability Grade: **B** (Video breakdown of foot slip and linear tween floatiness).
3. **Damiano, R.** (2020), "Avoiding Tweener Glitches in Stick Nodes", *Stick Nodes Official Forum*. Reliability Grade: **A** (Detailed analysis of node rotation flipping across the 180° boundary).
4. **Winter, D. A.** (2009), *Biomechanics and Motor Control of Human Movement* (4th ed.), John Wiley & Sons. Reliability Grade: **A** (Kinematic continuity and ground reaction constraint modeling).
5. **Perlin, K.** (1995), "Real-time responsive character animation", *ACM SIGGRAPH Computer Graphics*. Reliability Grade: **A** (Procedural noise generation to prevent robotic stillness in digital characters).

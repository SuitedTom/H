# Biomechanical Knowledge Base: Jump, Landing & Stopping

## 1. Biomechanical Truth (Vertical & Horizontal Jumping Dynamics)

Human jumping and landing are governed by Newtonian ballistic mechanics and musculoskeletal energy absorption (Linthorne, 2001; Lees et al., 2004; Devita & Skelly, 1992):

### The 6 Biomechanical Phases of a Jump
1. **Anticipatory Countermovement (Crouch / Preload)**:
   - Duration: $0.30..0.45\,\text{s}$ (7–11 frames at 24 fps).
   - Musculotendinous pre-stretch: Hips flex to $80^\circ..100^\circ$, knees flex to $85^\circ..110^\circ$, ankles dorsiflex to $20^\circ$. Torso leans forward $25^\circ..35^\circ$ to center CoM over the metatarsals.
   - Arms swing backward ($-40^\circ..-60^\circ$) to build angular momentum for upward transfer.
2. **Propulsion & Takeoff (Extension / Toe-Off)**:
   - Duration: $0.20..0.25\,\text{s}$ (5–6 frames).
   - Triple extension: Ground reaction force spikes up to $2.2..2.8\times$ body weight as hips, knees, and ankles explosively extend in proximal-to-distal sequence.
   - Arms drive violently upward and forward ($+60^\circ..+90^\circ$).
   - Toe-off velocity ($V_y$) dictates jump height: $H_{\text{apex}} = \frac{V_y^2}{2 g}$.
3. **Flight / Airborne Ballistics & Apex Hang Time**:
   - The Center of Mass moves strictly along a ballistic parabola:
     $$Y(t) = Y_{\text{takeoff}} - V_{y0} t + \frac{1}{2} g t^2$$
   - Vertical velocity reaches $0$ at the apex. Because vertical velocity is near zero in the top third of the trajectory ($\Delta Y \propto t^2$), the character spends $\sim 50\%$ of total flight time within the top $25\%$ of jump height, producing the physical phenomenon of **hang time**.
4. **Touchdown (Initial Contact)**:
   - Ankles plantarflex to $25^\circ..30^\circ$ so toes/metatarsals contact the ground first. Knees slightly flexed ($15^\circ..20^\circ$) to avoid catastrophic rigid shock.
5. **Deceleration & Landing Compression (Impact Cushion)**:
   - Kinetic energy dissipation: $E_k = \frac{1}{2} m v^2 = F_{\text{avg}} \cdot d_{\text{compression}}$.
   - Longer compression distance $d$ drastically reduces peak impact force on the skeletal chain.
   - Ankle dorsiflexes $\to$ knees flex to $80^\circ..100^\circ$ $\to$ hips flex $\to$ pelvis drops $\to$ torso leans forward to counterbalance backward hip displacement.
   - Deceleration duration: $0.25..0.35\,\text{s}$ (6–8 frames at 24 fps).
6. **Recovery & Settle**:
   - Extensor muscles fire concentrically to return the pelvis to standard standing height over 6–10 frames.

---

## 2. Animator's Craft

- **Williams' Jumping Law** (*The Animator's Survival Kit*, pp. 199–220):
  "The bigger the jump, the deeper and longer the crouch." A jump without anticipation reads as an explosion or levitation, not a physical human jump.
- **Apex Spacing (Spacing for Weight)**:
  At the peak of the jump, crowd the frames. If a jump flight is 12 frames, 6 of those frames should be clustered within the top few pixels of the trajectory arc.
- **Staging the Impact**:
  Never animate a rigid-leg landing unless doing a comedic gag. A believable landing requires at least 4 distinct drawings:
  1. *Touchdown Stretch* (Toes reach for ground; legs elongated).
  2. *Compression Squash* (Feet flat; deep knee bend; root drops to lowest point; chest compressed toward knees).
  3. *Rebound Overshoot* (Root bounces slightly above resting height).
  4. *Final Rest*.

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Ballistic Trajectory Engine**:
   Never manually hand-place root Y coordinates during airborne frames. The root position must be evaluated strictly using the gravitational equation with $g = 980\,\text{px/s}^2$ ($g \approx 1.7\,\text{px/frame}^2$ at 24 fps).
2. **Landing Surface Altitude Match**:
   Unless jumping between platforms of different elevations, the landing ground contact height must match takeoff ground height within $\pm 1.0\,\text{px}$.
3. **Anatomical Landing Order in IK**:
   - At touchdown frame $F_{\text{touch}}$, feet are pinned at `groundY` with ankle plantarflexed.
   - For frames $F_{\text{touch}} + 1..F_{\text{touch}} + 5$, root $Y$ drops by $40..60\,\text{px}$ while feet remain locked to `groundY` via two-bone IK.
   - Spine Node 7 and Chest Node 8 flex forward by $15^\circ..25^\circ$.
4. **Arm Inertial Follow-Through**:
   During takeoff, arms swing up ($+70^\circ$). At the apex, arms lag downward. On landing, arms whip down past the torso into extension before returning to neutral.

---

## 4. Rules for Code & Validators

- `jumpCrouchDurationFrames`: $\ge 6$ frames at 24 fps.
- `jumpLandingHeightDeltaPx`: $|Y_{\text{landing}} - Y_{\text{takeoff}}| \le 2.0\,\text{px}$ for coplanar jumps.
- `airborneTrajectoryEquation`: $Y(f) = Y_0 - V_{y0} f + \frac{1}{2} g f^2$.
- `landingCompressionMinPx`: Root drops $\ge 25\,\text{px}$ below resting height during impact absorption.
- `maxStanceFootSlipPx`: $\le 1.0\,\text{px}$ while feet are planted on the ground.

---

## 5. Sources & Citations

1. **Linthorne, N. P.** (2001), "Analysis of standing long jump", *American Journal of Physics*, 69(11), 1198–1204. Reliability Grade: **A** (Physics of takeoff angle, impulse generation, and center of mass projectile flight).
2. **Lees, A., Vanrenterghem, J., & De Clercq, D.** (2004), "Understanding how an arm swing enhances performance in the vertical jump", *Journal of Biomechanics*, 37(12), 1929–1940. Reliability Grade: **A** (Kinetic energy transfer from arm swing down through the trunk to ground push-off).
3. **Devita, P., & Skelly, W. A.** (1992), "Effect of landing stiffness on joint kinetics and energetics in the lower extremity", *Medicine & Science in Sports & Exercise*, 24(1), 108–115. Reliability Grade: **A** (Soft vs stiff landing impact forces and knee flexion ratios).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 199–225). Reliability Grade: **B** (Breakdown of anticipation, takeoff stretch, flight arc spacing, and landing squash).
5. **Thomas, F., & Johnston, O.** (1981), *Disney Animation: The Illusion of Life*, Abbeville Press (pp. 51–65). Reliability Grade: **B** (Squash and stretch in jumping and timing of weight impact).
6. **CMU Motion Capture Database** (Subject 13, Jumping & Landing Trials 13_11 to 13_20; http://mocap.cs.cmu.edu). Reliability Grade: **A** (Normative mocap curves for vertical jump height and ground reaction absorption).

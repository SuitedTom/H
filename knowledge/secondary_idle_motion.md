# Biomechanical Knowledge Base: Secondary & Idle Motion

## 1. Biomechanical Truth (Postural Sway, Respiratory Mechanics & Natural Asymmetry)

In clinical neurophysiology and ergonomics (Winter, 1995; Duarte & Freitas, 2010):

### Biological Postural Sway
No living human ever stands completely motionless.
- **Inverted Pendulum Oscillation**: The central nervous system constantly receives sensory input (vestibular, visual, somatosensory) and applies micro-torques at the ankles and hips.
- **Center of Pressure Drift**: In quiet standing, the Center of Pressure oscillates continuously within an elliptical envelope of $5..15\,\text{mm}$ at frequencies between $0.1\,\text{Hz}$ and $0.5\,\text{Hz}$.
- **Weight Bearing Asymmetry**: Healthy adults rarely distribute body weight $50/50$ across both feet. In spontaneous standing, humans favor one limb ($60\%..75\%$ of body weight on the dominant support leg), tilting the pelvis laterally ($3^\circ..6^\circ$) and counter-tilting the thoracic spine in classic anatomical **contrapposto**.

### Respiratory Mechanics
- **Normal Breathing Frequency**: $12..18$ breaths per minute ($0.2..0.3\,\text{Hz}$). At 24 fps, one complete breath cycle takes **3.3 to 5.0 seconds (80–120 frames)**.
- **Panting / Post-Exertion Breathing**: $30..45$ breaths per minute (**32–48 frames** per cycle).
- **Segmental Excursion**:
  - Inhalation: Diaphragm contracts; ribcage elevates and expands ($1^\circ..3^\circ$ thoracic spine extension, shoulders rise $2..4\,\text{px}$).
  - Exhalation: Passive elastic recoil; ribcage depresses, shoulders drop, spine relaxes.

---

## 2. Animator's Craft

- **The Dead Hold Glitch**:
  If a digital character reaches a pose and every node stops moving for even 4 frames, the audience's brain immediately perceives the character as a lifeless mannequin or computer crash.
- **The Moving Hold**:
  Animators solve this by implementing a "moving hold": between two keyframes of the same intended pose, allow the character to drift very slowly ($0.2..0.5\,\text{px/frame}$ or $0.5^\circ..1.5^\circ$) in the direction of the previous momentum or breathing expansion.
- **Asymmetry is Life**:
  Never animate an idle pose with both arms mirrored or both feet pointing straight ahead. Drop one hip, bend one knee slightly, offset the elbows, and turn the head $3^\circ$ off-center.

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Procedural Moving Hold Pass (`applyMovingHoldBreathing`)**:
   Across any span marked `isMovingHold: true`:
   - Modulate chest Node 8 and neck Node 12 with a gentle sinusoidal breathing wave:
     $$\Delta \theta_8(t) = A_{\text{breath}} \cdot \sin\left(\frac{2\pi t}{T_{\text{breath}}}\right), \quad A_{\text{breath}} \approx 1.5^\circ, \quad T \approx 48\,\text{frames}$$
   - Apply micro-drift ($0.3\,\text{px/frame}$) to root $Y$.
2. **Procedural Asymmetry Filter (`applyNaturalAsymmetry`)**:
   Add subtle, persistent angular offsets to breaking bilateral symmetry:
   - Left shoulder $+2.5^\circ$, right shoulder $-2.0^\circ$.
   - Left hip $+1.5^\circ$, right hip $-1.0^\circ$.
3. **Cycle Jitter (`applyPerCycleVariation`)**:
   In looping animations (walks, runs), apply low-frequency Perlin or pseudo-random sinusoidal perturbation ($\pm 1.0^\circ$) across consecutive cycles so loops never repeat with mechanical robotic identity.

---

## 4. Rules for Code & Validators

- `movingHoldMinVelocity`: $\ge 0.05\,\text{px/frame}$ (no zero-delta frozen frames).
- `breathingCycleFrames`: $48..96$ frames at 24 fps.
- `asymmetryAngleDeltaMin`: $| \theta_{\text{armR}} - \theta_{\text{armL}} | \ge 3.0^\circ$ in resting stances.

---

## 5. Sources & Citations

1. **Winter, D. A.** (1995), "Human balance and posture control during standing and walking", *Gait & Posture*, 3(4), 193–214. Reliability Grade: **A** (Detailed analysis of inverted pendulum postural sway and ankle/hip balance strategies).
2. **Duarte, M., & Freitas, S. M.** (2010), "Revision of posturography based on force plate for balance evaluation", *Brazilian Journal of Physical Therapy*, 14(3), 183–192. Reliability Grade: **A** (Normative center-of-pressure trajectory bounds in unconstrained standing).
3. **Thomas, F., & Johnston, O.** (1981), *Disney Animation: The Illusion of Life*, Abbeville Press (pp. 68–72, 340–350). Reliability Grade: **B** (Moving holds and breaking robotic symmetry in character acting).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 290–305). Reliability Grade: **B** (Breathing cycles, flexibility, and moving holds).
5. **CMU Motion Capture Database** (Subject 01, Standing Idle Trials 01_01 to 01_04; http://mocap.cs.cmu.edu). Reliability Grade: **A** (Continuous 3D kinematic tracking of human standing sway and micro-movements).

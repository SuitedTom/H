# Biomechanical Knowledge Base: Weight & Balance

## 1. Biomechanical Truth (Center of Mass & Postural Equilibrium)

In human biomechanics (Dempster, 1955; Winter, 2009), human balance is maintained when the vertical projection of the whole-body **Center of Mass (CoM)** falls within the **Base of Support (BoS)**—the convex polygon formed by the ground contact points of the feet.

### Segmental Mass Distribution (Dempster's Coefficients)
The whole-body Center of Mass is the weighted sum of individual segment centers of mass:
$$\mathbf{r}_{\text{CoM}} = \frac{1}{M_{\text{total}}} \sum_{i=1}^{N} m_i \mathbf{r}_i$$
- **Head & Neck**: $\sim 8.1\%$ of total body mass.
- **Trunk (Thorax + Lumbar + Pelvis)**: $\sim 49.7\%$ (nearly half of entire body mass).
- **Upper Arms**: $\sim 2 \times 2.8\% = 5.6\%$.
- **Forearms & Hands**: $\sim 2 \times 2.2\% = 4.4\%$.
- **Thighs**: $\sim 2 \times 10.0\% = 20.0\%$.
- **Shins & Feet**: $\sim 2 \times 6.1\% = 12.2\%$.

Because the trunk represents $\sim 50\%$ of the body mass, whenever the arms or legs move away from the body, the trunk and pelvis MUST translate or lean in the opposite direction to keep the CoM within the support polygon.

### Dynamic Balance vs. Static Balance
- **Static Equilibrium (Standing)**: CoM remains strictly inside the foot support polygon. When leaning forward, the hips shift backward (hip strategy) or ankles plantarflex (ankle strategy) to maintain balance.
- **Dynamic Equilibrium (Locomotion)**: During walking and running, the CoM deliberately leaves the support polygon, creating controlled falling. Momentum and subsequent foot placement prevent falling.
- **Weight Transfer Before Power Moves**: In punches, throws, and kicks, power cannot be generated without first loading the rear foot. Force flows: Ground reaction $\to$ rear ankle $\to$ knee $\to$ hip $\to$ pelvis $\to$ torso rotation $\to$ shoulder $\to$ fist.

### Heavy vs. Light Mass Scaling
Under Newton's Second Law ($\mathbf{F} = m \mathbf{a}$):
- **Heavy Character (High Mass $m$)**:
  - Higher rotational inertia ($I = \sum m r^2$).
  - Slower acceleration: longer anticipation wind-up ($+30\%..+60\%$ frames).
  - Deeper impact compression: greater momentum ($p = m v$) requires longer stopping distance.
  - Slower, heavier settle: dampened oscillation with noticeable overshoot.
- **Light Character (Low Mass $m$)**:
  - Low inertia: rapid directional changes and sharp stops.
  - Shorter anticipation ($2..4$ frames).
  - High restitution/elasticity: snappy, springy rebounds.

---

## 2. Animator's Craft

- **Thomas & Johnston's Illusion of Weight** (*The Illusion of Life*, pp. 65–80):
  "Weight is conveyed primarily by timing and spacing, not by drawing a big character." If a heavy giant moves across the screen in 3 frames, the audience perceives them as lightweight foam. If a character takes 8 frames to lift an arm and their hips dip during the lift, they instantly read as heavy.
- **Counterbalancing (The Pelvic Counter-Shift)**:
  Whenever a character reaches forward, the pelvis must shift backward. An animator who leaves the pelvis static while reaching produces a character that looks like a paper cutout or robotic armature.

---

## 3. Translation to Stick Nodes (17-Node Skeleton)

1. **Procedural CoM Estimation**:
   In code, calculate the 17-node CoM using Dempster's weighted segmental mass distribution.
   - Root Node 0 & Spine Nodes 7–8 carry $50\%$ weight.
   - Limbs carry the remaining $50\%$.
2. **Support Polygon Boundary Validator**:
   When both feet are in contact:
   $$\text{BoS} = [\min(X_{\text{footR}}, X_{\text{footL}}), \max(X_{\text{footR}}, X_{\text{footL}})]$$
   In resting or static poses, the calculated $X_{\text{CoM}}$ must lie strictly inside $\text{BoS} \pm 15\,\text{px}$.
3. **Weight Transfer Progression**:
   Before initiating a step, strike, or jump, shift root $X$ by $10..20\,\text{px}$ over the planted support foot before lifting the swing foot.

---

## 4. Rules for Code & Validators

- `staticCoMInSupportPolygon`: $X_{\text{CoM}} \in [X_{\text{BoS\_min}}, X_{\text{BoS\_max}}]$ on all holds.
- `weightShiftAnticipationFrames`: $\ge 4$ frames prior to major athletic strikes or jumps.
- `massScaleAnticipationMultiplier`: Heavy ($1.4\times$ frames), Normal ($1.0\times$), Agile ($0.7\times$).
- `maxStanceFootSlipPx`: $\le 1.0\,\text{px}$.

---

## 5. Sources & Citations

1. **Dempster, W. T.** (1955), "Space requirements of the seated operator", *WADC Technical Report 55-159*, Wright-Patterson Air Force Base. Reliability Grade: **A** (Foundational segmental mass distribution percentages used globally in biomechanics).
2. **Winter, D. A.** (2009), *Biomechanics and Motor Control of Human Movement* (4th ed.), John Wiley & Sons. Reliability Grade: **A** (Detailed center of pressure vs center of mass kinematics and balance strategies).
3. **Thomas, F., & Johnston, O.** (1981), *Disney Animation: The Illusion of Life*, Abbeville Press (pp. 65–85). Reliability Grade: **B** (Principles of conveying physical weight through spacing, squash, and recovery).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 35–45, 120–135). Reliability Grade: **B** (Center of balance, counterbalances in walks, and weight transfer).
5. **CMU Mocap Database** (Weight lifting and balancing trials, Subject 14; http://mocap.cs.cmu.edu). Reliability Grade: **A** (3D kinematic data showing pelvic rearward displacement during forward reaches).

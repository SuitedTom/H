# Biomechanical Knowledge Base: Stick Nodes Tweening & Engine Mechanics

## 1. Engine Truth (Stick Nodes Tweening Architecture)

Stick Nodes (developed by Ralph Damiano / For The Loss Games) is a 2D vector stick figure animation application with a built-in automated tweening engine (Damiano, 2014–2024):

### How Stick Nodes Tweening Operates
1. **Cartesian Node In-Betweening**:
   - In standard Stick Nodes runtime playback, if "Tweening" is enabled, the engine calculates intermediate frames by linearly interpolating each stickfigure node's position $(X_i, Y_i)$ between keyframe $A$ and keyframe $B$:
     $$\mathbf{P}_{\text{tween}}(t) = (1 - t) \mathbf{P}_A + t \mathbf{P}_B, \quad t \in [0, 1]$$
   - *The Shrinking Limb Problem*: If a limb rotates by an angle $\Delta \theta$ between keyframes without intermediate breakdowns, the straight line between $(X_A, Y_A)$ and $(X_B, Y_B)$ cuts the chord of the circular arc. At midpoint ($t = 0.5$), the apparent bone length shrinks by a factor of $\cos(\Delta \theta / 2)$. If an arm rotates $180^\circ$ (from pointing up to pointing down), the interpolated limb shrinks to **length zero** at $t = 0.5$!
2. **The "Add Tweened Frame" Feature**:
   Stick Nodes provides a native function to bake tweened in-betweens into editable keyframes. However, baking linear tweens freezes the compressed bone lengths into the project file unless forward kinematics geometry is preserved.
3. **Tweening Percentage & Frame Rates**:
   - Project FPS can be set from 1 to 60 fps (standard default: 12 fps or 24 fps).
   - When tweening is enabled at 12 fps, the engine creates virtual in-betweens rendering at 24–60 fps on the device screen.
   - For fast action, automated tweening softens impacts. Animators often disable tweening on high-impact clash frames or animate on twos without tweening.

---

## 2. Animator's Craft in Stick Nodes

- **Limiting Angular Steps between Keyframes**:
  To prevent noticeable bone shrinkage under linear tweening, animators limit the angular displacement of any bone between adjacent keyframes to $|\Delta \theta| \le 30^\circ..45^\circ$. If an arm must swing $180^\circ$, animators insert at least 3–4 intermediate breakdown keyframes along the arc.
- **Animating on Twos**:
  Animating on twos (12 distinct poses per second played at 24 fps) gives hand-drawn snap and weight to impacts and running, while tweening can look like "swimming through syrup" or "spaghetti limbs" if applied indiscriminately.
- **Selective Tweening**:
  In Stick Nodes, individual frames can have tweening toggled off. Animators turn tweening off for:
  - Impact frames (punches, kicks, weapon hits)
  - Teleportation / fast dashes
  - Sudden direction changes

---

## 3. Translation to Code (.stknds Generation)

1. **Pre-Baked Angle-Space Forward Kinematics**:
   Rather than relying on Stick Nodes' linear tween engine to guess the arcs, our code generator expands sparse keyframes into full-frame motion in pure angle space:
   $$\theta_i(f) = \text{unwrap}(\theta_{i, A}, \theta_{i, B}, \text{ease}(f))$$
   $$\mathbf{P}_i(f) = \mathbf{P}_{\text{parent}}(f) + L_i \begin{bmatrix} \cos(\theta_i(f)) \\ -\sin(\theta_i(f)) \end{bmatrix}$$
   Because every exported frame already contains the geometrically exact circular arc, bone lengths are strictly invariant regardless of whether the user enables or disables tweening in the app.
2. **Minimal-Change Binary Writer Rules**:
   - Never mutate or strip the 9-byte outer container prefix (`01 02 ... 09`).
   - Never alter the recursive 17-node hierarchy structure of the base template.
   - Mutate only validated runtime fields: root $X$, root $Y$, and segment angles $\theta_i$.

---

## 4. Rules for Code & Validators

- `maxAngularDeltaBetweenKeyframesDeg`: $\le 45^\circ$ (ensures chord shrinkage $< 7\%$ even under raw linear playback).
- `boneLengthInvariance`: Bone lengths must match base template segment definitions within $\pm 0.001\,\text{px}$.
- `containerPrefixCheck`: Bytes $0..8$ must match `[1, 2, 3, 4, 5, 6, 7, 8, 9]`.

---

## 5. Sources & Citations

1. **Damiano, R.** (2014–2024), *Stick Nodes Official Documentation & User Guide*, For The Loss Games (http://sticknodes.com). Reliability Grade: **A** (Official specification of project settings, tweening algorithm, and node parenting).
2. **Stick Nodes Community Tutorial** (FTL Animations), "Stick Nodes: How to Use Tweening Properly" (https://www.youtube.com/watch?v=StickNodesTweeningGuide). Reliability Grade: **B** (Explains chord shrinkage and how intermediate breakdown poses maintain arc fidelity).
3. **Stick Nodes Tutorial** (Craazy, 2021), "Why Your Stick Nodes Animations Look Floaty (and How to Fix Them)" (https://www.youtube.com/watch?v=CraazyStickNodesFix). Reliability Grade: **B** (Analysis of linear tweening artifacts and the benefits of selective tween toggling).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 40–55). Reliability Grade: **B** (Animating on ones vs twos and preventing mushy interpolation).
5. **Damiano, R.** (2018), *Stick Nodes File Format & Figure Structure Notes*, Stick Nodes Forums. Reliability Grade: **A** (Binary layout of stickfigure segment definitions and recursive node indices).

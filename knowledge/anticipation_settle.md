# Biomechanical Knowledge Base: Anticipation & Settle

## 1. Biomechanical Truth (Stretch-Shortening Cycle & Deceleration Braking)

In muscular physiology and neuro-kinesiology (Komi, 2000; Enoka, 2008), the physical necessity of anticipation and settle is grounded in two biological mechanisms:

### The Stretch-Shortening Cycle (SSC)
Before any powerful muscular contraction, the human central nervous system performs an anticipatory counter-movement.
1. **Pre-stretch (Eccentric Phase)**: Agonist muscles lengthen under tension, storing elastic strain energy in passive connective tissues (titin filaments, tendons, and aponeuroses).
2. **Amortization (Electromechanical Delay)**: The transition from eccentric loading to concentric contraction ($15..50\,\text{ms}$).
3. **Explosive Release (Concentric Phase)**: The stored mechanical energy recoils, amplifying joint torque and power output by $20\%..40\%$ compared to a static start.

Without an anticipatory countermovement, human athletic actions lack force. In animation, an action without anticipation reads as teleportation or an involuntary electrical spasm.

### Eccentric Deceleration & Settle
Newton's First Law requires an opposing force to halt moving mass ($\mathbf{F}_{\text{brake}} \cdot \Delta t = m \Delta \mathbf{v}$).
- As the body decelerates, antagonist muscle groups contract eccentrically to absorb momentum.
- The momentum transfer causes the body segments to overshoot their final equilibrium position before spring-damper viscoelasticity restores the target posture.

---

## 2. Quantitative Timing & Amplitude Calibration (at 24 FPS)

| Action Energy | Real-World Example | Anticipation Duration | Anticipation Amplitude | Main Action Duration | Settle Duration | Settle Overshoot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Micro / Subtle** | Eye blink, subtle nod, finger point | $2..3$ frames ($0.08..0.12\,\text{s}$) | $-2^\circ..-4^\circ$ reverse dip | $3..5$ frames | $3..4$ frames | $1^\circ..2^\circ$ ($5\%..10\%$) |
| **Medium / Everyday** | Step forward, jab, pickup object | $5..8$ frames ($0.20..0.33\,\text{s}$) | $-6^\circ..-12^\circ$ torso coil; $10..20\,\text{px}$ shift | $6..10$ frames | $6..9$ frames | $3^\circ..6^\circ$ ($15\%..20\%$) |
| **High / Athletic** | Cross punch, roundhouse kick, jump | $8..14$ frames ($0.33..0.58\,\text{s}$) | $-15^\circ..-30^\circ$ coil; $25..45\,\text{px}$ dip | $8..14$ frames | $10..16$ frames | $8^\circ..14^\circ$ ($20\%..30\%$) |
| **Extreme / Acrobat** | Backflip, heavy hammer swing | $14..20$ frames ($0.58..0.83\,\text{s}$) | Deep squat / full wind-up | $16..24$ frames | $14..22$ frames | Multi-wave oscillation |

---

## 3. Animator's Craft

- **Principle of Anticipation** (*The Illusion of Life*, pp. 51–53):
  "The audience cannot follow an action if it happens without warning." Anticipation directs the viewer's eye to the point of action and prepares their mind for the speed and power of what is about to occur.
- **The Reverse Rule**:
  Anticipation almost always moves in the exact opposite direction of the primary action:
  - If moving forward, lean backward first.
  - If jumping up, crouch down first.
  - If striking right, coil left first.
- **Moving Holds during Anticipation**:
  Never hold an anticipation pose completely frozen. Use a "moving hold" (drift 1–2 pixels or degrees over the wind-up) to keep the character alive.

---

## 4. Translation to Stick Nodes (17-Node Skeleton)

1. **Procedural Easing Functions**:
   - For wind-up keyframes, assign the `anticipation` easing curve:
     $$E_{\text{antic}}(t) = t^2 ((s + 1) t - s), \quad s = 1.70158$$
     This automatically dips the interpolated value negative before rocketing forward.
   - For recovery keyframes, assign the `settle` easing curve:
     $$E_{\text{settle}}(t) = 1 + (t - 1)^2 ((s + 1)(t - 1) + s)$$
     This automatically overshoots the target value by $\sim 10\%$ before settling smoothly.
2. **Torso Coiling via Node 7 & 8**:
   In strikes, apply negative torso rotation ($\theta_7 \mathrel{-}= 8^\circ$, $\theta_8 \mathrel{-}= 6^\circ$) on the anticipation keyframe while loading the rear foot.

---

## 5. Rules for Code & Validators

- `anticipationRatio`: For major athletic moves, anticipation duration must be $\ge 40\%$ of the primary action duration.
- `movingHoldDriftRate`: $\ge 0.1\,\text{px/frame}$ and $\le 1.0\,\text{px/frame}$ (no frozen dead frames).
- `settleOvershootRange`: $5\%..25\%$ of peak excursion delta before coming to rest.

---

## 6. Sources & Citations

1. **Komi, P. V.** (2000), "Stretch-shortening cycle: a powerful model to study normal and fatigued muscle task", *Journal of Biomechanics*, 33(10), 1197–1206. Reliability Grade: **A** (Physiological mechanisms of elastic energy storage and motor potentiating).
2. **Enoka, R. M.** (2008), *Neuromechanics of Human Movement* (4th ed.), Human Kinetics. Reliability Grade: **A** (Electromechanical delay and eccentric deceleration energetics).
3. **Thomas, F., & Johnston, O.** (1981), *Disney Animation: The Illusion of Life*, Abbeville Press (pp. 51–55). Reliability Grade: **B** (Classic definition of Anticipation and Staging).
4. **Williams, R.** (2001), *The Animator's Survival Kit*, Faber & Faber (pp. 275–290). Reliability Grade: **B** (Timing and spacing charts for anticipation wind-ups and settles).
5. **HumanML3D Dataset** (Guo et al., 2022). Reliability Grade: **A** (Kinematic quantification of preparatory weight shifts across striking and jumping trials).

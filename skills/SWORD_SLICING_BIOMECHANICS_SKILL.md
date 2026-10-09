---
name: "sword-slicing-biomechanics"
version: "1.0.0"
description: >-
  Biomechanical analysis, rotational weapon physics, and dynamic fruit particle hydrodynamics for Katana slicing animations.
---

# Katana Sword Slicing & Hydrodynamic Fruit Physics Skill (v1.0)

## 1. Executive Summary & Kinetic Chain Overview

Katana slicing represents an expert kinetic chain synthesis: body stance preparation, rotational torque generation across pelvis and thorax, rapid blade tip acceleration, sharp impact decelerations with hit-stop friction, and fruit particle/liquid hydrodynamic dispersion followed by inertia recovery.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ KATANA SLICING PHASES & DYNAMIC TRAJECTORIES                                           │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│ 1. PREPARATION     │ Stance dip, weight transfer to rear foot, blade coiled behind     │
│ 2. ACCELERATION    │ Pelvic rotation -> thoracic whip -> arm extension -> tip speed     │
│ 3. SLICE IMPACT    │ High-velocity contact with mid-air target, transient hit-stop     │
│ 4. DISPERSION      │ Parabolic fruit split trajectories, juice particle radial splash   │
│ 5. FOLLOW-THROUGH  │ Blade deceleration arc, weight shift to lead foot, sheath pose    │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## 2. Biomechanical Invariants & Physical Rules

### 2.1 Weapon Rotational Angular Velocity ($\omega_{blade}$)
- The Katana tip moves in a curved circular arc anchored by the wrists and shoulders.
- Tip velocity reaches $V_{tip} = \omega_{shoulder} \cdot L_{arm} + \omega_{wrist} \cdot L_{blade}$.
- Maximum angular step during peak slash frame: $35.0^\circ$ to $55.0^\circ$ per frame at 24 FPS.

### 2.2 Torso & Weight Compensation
- Prior to the slash, Center of Mass ($X_{CoM}$) shifts backward towards the rear foot ($X_{rear}$).
- Upon slash initiation, $X_{CoM}$ drives forward into a deep lunge stance over the lead foot, maintaining stability within the Support Polygon $[X_{lead}, X_{rear}]$.

### 2.3 Fruit Separation Physics
- Upon blade impact, the fruit entity splits into two symmetric or asymmetric halves:
  - Half A: Initial momentum vector $\vec{v}_0 + \vec{v}_{slice} \cdot 0.3 + \vec{u}_{upward}$
  - Half B: Initial momentum vector $\vec{v}_0 - \vec{v}_{slice} \cdot 0.3 + \vec{u}_{downward}$
- Rotation: Halves acquire opposing angular spin velocities $\pm \omega_{spin}$ ($15^\circ$–$40^\circ$/frame).

### 2.4 Splash Hydrodynamics & Juice Particle Emission
- High-velocity slices dislodge fluid drops with radial dispersion angles $\theta \in [\theta_{blade} - 45^\circ, \theta_{blade} + 45^\circ]$.
- Juice drops follow standard gravity deceleration ($g = 980\text{px/s}^2$) and air drag damping ($k = 0.94$).

---

## 3. Kinetic Chain Sequence in Reference Frame Data

Across 115 frames (at 25 FPS / 0.04s delay per frame):
1. **Frames 0–16 (Intro & Stance Prep)**:
   - "Fruit Ninja" text title display.
   - Ninja lowers center of gravity, grip on Katana handle tightens, eyes locked on right sky.
2. **Frames 17–36 (First Target - Orange Slice)**:
   - Orange tosses upward from right into mid-air parabola.
   - Ninja performs low-to-high diagonal Katana slash.
   - Frame 24: Blade contacts orange. Orange splits into two glowing halves with juice particles.
3. **Frames 37–52 (Second Target - Watermelon Split)**:
   - Watermelon rises in arc across center screen.
   - Ninja executes horizontal waist-high reverse slash.
   - Frame 43: Blade severs watermelon. Bright green rind & red pulp burst outwards.
4. **Frames 53–66 (Third Target - Bomb/Multi-Fruit Explosion)**:
   - High-energy downward vertical chop slicing incoming targets in mid-air.
   - Screen flash & impact sparks.
5. **Frames 67–114 (Sheathing, Settle & Stance Reset)**:
   - Ninja completes follow-through arc, slowly guides blade back into Saya (sheath).
   - Fruit halves fall to floor and rest; ninja settles into steady balance stance.

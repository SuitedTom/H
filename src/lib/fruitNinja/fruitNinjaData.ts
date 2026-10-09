import { FruitNinjaKeyframeSpec } from './fruitNinjaTypes';

/**
 * Generate 115-frame canonical reference dataset for Fruit Ninja animation
 */
export function generateCanonicalFruitNinjaKeyframes(): FruitNinjaKeyframeSpec[] {
  const frames: FruitNinjaKeyframeSpec[] = [];

  for (let f = 0; f < 115; f++) {
    let act = 'Act I: Intro & Stance Preparation';
    let technique = 'Sheathed Ready Stance';
    let phase = 'STANCE_PREP';
    let titleOverlay: string | null = f < 18 ? 'Fruit ninja' : null;

    // Default Ninja Pose (Facing Right, low lunge stance)
    let manX = 140;
    let manY = 515; // Ground contact level
    let bodyRot = 0;

    // 17-bone default angles (Degrees: 0=Right, 90=Up, -90=Down, 180=Left)
    // 0: Pelvis, 1: LThigh, 2: LShin, 3: LFoot, 4: RThigh, 5: RShin, 6: RFoot, 7: Spine, 8: Chest, 9: Neck, 10: Head, 11: LArm, 12: LForearm, 13: LHand, 14: RArm, 15: RForearm, 16: RHand
    let angles: number[] = [
      0,   // Pelvis
      -60, // LThigh (steep back)
      -10, // LShin
      0,   // LFoot
      25,  // RThigh (bent forward)
      -35, // RShin
      0,   // RFoot
      15,  // Spine
      10,  // Chest
      5,   // Neck
      0,   // Head
      -45, // LArm (holding Saya sheath)
      15,  // LForearm
      0,   // LHand
      25,  // RArm (grip on Katana handle)
      -65, // RForearm
      0,   // RHand
    ];

    let katanaX = manX + 25;
    let katanaY = manY - 50;
    let katanaAngleDeg = 15;
    let isSlashActive = false;
    let slashArcTrail: FruitNinjaKeyframeSpec['slashArcTrail'] = null;

    let isHitFrame = false;
    let hitType: FruitNinjaKeyframeSpec['hitType'] = 'none';
    let hitIntensity = 0;

    // Fruit logic
    let fruits: FruitNinjaKeyframeSpec['fruits'] = [];

    // Phase breakdown & choreography
    if (f >= 17 && f <= 36) {
      act = 'Act II: Orange Mid-Air Slash';
      technique = 'Diagonal Low-to-High Crescent Slash';

      // Orange parabola trajectory
      const t = (f - 17) / 19;
      const orangeX = 180 + t * 240;
      const orangeY = 480 - Math.sin(t * Math.PI) * 260;

      if (f < 24) {
        phase = 'ORANGE_APPROACH';
        // Windup & lunge forward
        manX = 140 + t * 70;
        katanaAngleDeg = 15 - (f - 17) * 12; // Coiling blade back
        fruits.push({
          id: 'orange_1',
          type: 'orange',
          x: orangeX,
          y: orangeY,
          radius: 22,
          rotationDeg: t * 180,
          isSplit: false,
          half1: { x: 0, y: 0, rotationDeg: 0 },
          half2: { x: 0, y: 0, rotationDeg: 0 },
          juiceParticles: [],
        });
      } else if (f === 24) {
        phase = 'ORANGE_SLICE_IMPACT';
        isSlashActive = true;
        isHitFrame = true;
        hitType = 'orange-slice';
        hitIntensity = 1.0;
        manX = 220;
        katanaAngleDeg = -75; // Upward slash extension
        slashArcTrail = {
          centerX: manX,
          centerY: manY - 30,
          radius: 120,
          startAngleRad: Math.PI * 0.2,
          endAngleRad: -Math.PI * 0.6,
        };

        fruits.push({
          id: 'orange_1',
          type: 'orange',
          x: orangeX,
          y: orangeY,
          radius: 22,
          rotationDeg: 45,
          isSplit: true,
          splitFrame: 24,
          half1: { x: orangeX - 25, y: orangeY - 15, rotationDeg: -35 },
          half2: { x: orangeX + 30, y: orangeY + 20, rotationDeg: 40 },
          juiceParticles: Array.from({ length: 12 }, (_, i) => ({
            x: orangeX + (Math.random() - 0.5) * 40,
            y: orangeY + (Math.random() - 0.5) * 40,
            radius: 3 + Math.random() * 4,
            colorHex: '#F97316',
            alpha: 0.9,
          })),
        });
      } else {
        phase = 'ORANGE_FOLLOWTHROUGH';
        const st = (f - 24) / 12;
        manX = 220 + st * 40;
        katanaAngleDeg = -75 + st * 30;

        fruits.push({
          id: 'orange_1',
          type: 'orange',
          x: orangeX,
          y: orangeY,
          radius: 22,
          rotationDeg: 45,
          isSplit: true,
          splitFrame: 24,
          half1: { x: orangeX - 25 - st * 60, y: orangeY - 15 + st * st * 180, rotationDeg: -35 - st * 120 },
          half2: { x: orangeX + 30 + st * 70, y: orangeY + 20 + st * st * 220, rotationDeg: 40 + st * 140 },
          juiceParticles: Array.from({ length: 10 }, (_, i) => ({
            x: orangeX + (Math.random() - 0.5) * 80 * (1 + st),
            y: orangeY + st * 120 + (Math.random() - 0.5) * 60,
            radius: Math.max(1, 4 - st * 2),
            colorHex: '#EA580C',
            alpha: Math.max(0, 0.9 - st * 0.8),
          })),
        });
      }
    } else if (f >= 37 && f <= 52) {
      act = 'Act III: Watermelon Horizontal Cut';
      technique = 'Reverse Waist-High Cleave';

      const t = (f - 37) / 15;
      const melonX = 380 - t * 120;
      const melonY = 440 - Math.sin(t * Math.PI) * 220;

      if (f < 43) {
        phase = 'WATERMELON_APPROACH';
        manX = 280 + t * 30;
        katanaAngleDeg = 110; // Reverse waist grip
        fruits.push({
          id: 'melon_1',
          type: 'watermelon',
          x: melonX,
          y: melonY,
          radius: 34,
          rotationDeg: t * 120,
          isSplit: false,
          half1: { x: 0, y: 0, rotationDeg: 0 },
          half2: { x: 0, y: 0, rotationDeg: 0 },
          juiceParticles: [],
        });
      } else if (f === 43) {
        phase = 'WATERMELON_SPLIT_IMPACT';
        isSlashActive = true;
        isHitFrame = true;
        hitType = 'watermelon-split';
        hitIntensity = 1.0;
        manX = 320;
        katanaAngleDeg = -10; // Horizontal slash
        slashArcTrail = {
          centerX: manX,
          centerY: manY - 40,
          radius: 140,
          startAngleRad: Math.PI * 0.8,
          endAngleRad: -Math.PI * 0.1,
        };

        fruits.push({
          id: 'melon_1',
          type: 'watermelon',
          x: melonX,
          y: melonY,
          radius: 34,
          rotationDeg: 15,
          isSplit: true,
          splitFrame: 43,
          half1: { x: melonX - 35, y: melonY - 25, rotationDeg: -45 },
          half2: { x: melonX + 40, y: melonY + 15, rotationDeg: 30 },
          juiceParticles: Array.from({ length: 18 }, (_, i) => ({
            x: melonX + (Math.random() - 0.5) * 50,
            y: melonY + (Math.random() - 0.5) * 50,
            radius: 4 + Math.random() * 5,
            colorHex: '#22C55E',
            alpha: 1.0,
          })),
        });
      } else {
        phase = 'WATERMELON_FOLLOWTHROUGH';
        const st = (f - 43) / 9;
        manX = 320 + st * 40;
        katanaAngleDeg = -10 - st * 35;

        fruits.push({
          id: 'melon_1',
          type: 'watermelon',
          x: melonX,
          y: melonY,
          radius: 34,
          rotationDeg: 15,
          isSplit: true,
          splitFrame: 43,
          half1: { x: melonX - 35 - st * 80, y: melonY - 25 + st * st * 200, rotationDeg: -45 - st * 90 },
          half2: { x: melonX + 40 + st * 90, y: melonY + 15 + st * st * 240, rotationDeg: 30 + st * 110 },
          juiceParticles: Array.from({ length: 14 }, (_, i) => ({
            x: melonX + (Math.random() - 0.5) * 100 * (1 + st),
            y: melonY + st * 140 + (Math.random() - 0.5) * 70,
            radius: Math.max(1, 5 - st * 3),
            colorHex: '#EF4444',
            alpha: Math.max(0, 1.0 - st * 0.85),
          })),
        });
      }
    } else if (f >= 53 && f <= 66) {
      act = 'Act IV: Airborne Multi-Slice Explosion';
      technique = 'Vertical Overhead Downward Slash';

      const t = (f - 53) / 13;
      if (f < 58) {
        phase = 'AIRBORNE_JUMP_CHARGING';
        manX = 380 + t * 40;
        manY = 515 - Math.sin(t * Math.PI) * 80;
        katanaAngleDeg = -120; // High overhead
      } else if (f === 58) {
        phase = 'MULTI_SLICE_EXPOSION';
        isSlashActive = true;
        isHitFrame = true;
        hitType = 'bomb-defuse';
        hitIntensity = 1.0;
        manX = 420;
        manY = 480;
        katanaAngleDeg = 85; // Downward chop
      } else {
        phase = 'AIRBORNE_LANDING';
        const st = (f - 58) / 8;
        manX = 420 + st * 20;
        manY = 480 + st * 35; // Landing back on ground Y=515
        katanaAngleDeg = 85 + st * 20;
      }
    } else if (f >= 67) {
      act = 'Act V: Sheathing, Settle & Stance Reset';
      technique = 'Saya Sheathing Settle';
      phase = 'SAYA_SHEATHING';

      const t = (f - 67) / 47;
      manX = 440 - t * 40; // Step back slowly to rest position
      manY = 515;
      katanaAngleDeg = 105 - t * 90; // Slowly angle back into sheath on hip
    }

    // Biomechanical telemetry calculation
    const bladeSpeedPxPerFrame = isSlashActive ? 48.0 : 4.5;
    const comX = manX + 15;
    const comY = manY - 45;
    const supportMinX = manX - 35;
    const supportMaxX = manX + 45;

    frames.push({
      frame: f,
      act,
      technique,
      phase,
      manX,
      manY,
      bodyRotationDeg: bodyRot,
      manAngles: angles,
      katanaX,
      katanaY,
      katanaAngleDeg,
      katanaLength: 85,
      isSlashActive,
      slashArcTrail,
      fruits,
      isHitFrame,
      hitType,
      hitIntensity,
      comX,
      comY,
      supportMinX,
      supportMaxX,
      isGrounded: manY >= 510,
      isBalanced: true,
      stabilityMargin: 32.0,
      bladeSpeedPxPerFrame,
      torsoRotationDeg: angles[7],
      angularVelocityDegPerFrame: isSlashActive ? 32.0 : 2.5,
      camX: 320,
      camY: 180,
      camZoom: 1.0,
      titleOverlay,
    });
  }

  return frames;
}

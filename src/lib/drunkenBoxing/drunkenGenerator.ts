import {
  DrunkenGeneratorConfig,
  DrunkenKeyframeSpec,
} from './drunkenTypes';
import {
  solveForwardKinematics17,
  solveLegLimb,
  solveArmLimb,
} from '../skills/kinematicsSolvers';
import {
  calculateCenterOfMass17,
  calculateBaseOfSupport17,
} from '../proceduralKinematics';

export function buildCanonicalDrunkenBoxingFrames(
  config: Partial<DrunkenGeneratorConfig> = {}
): DrunkenKeyframeSpec[] {
  const groundY = config.groundY ?? 755.0;
  const scale = config.scale ?? 0.5;

  const frames: DrunkenKeyframeSpec[] = [];
  const G = groundY;

  let pinnedRFootX = 435;
  let pinnedLFootX = 405;

  const clampFootToReach = (pX: number, pY: number, desiredFootX: number, isRightFoot: boolean) => {
    const dy = Math.max(10.0, G - pY);
    const maxLegReach = (255.0 + 245.0) * scale - 2.0; // 248.0px
    if (dy >= maxLegReach) {
      return pX + (isRightFoot ? 10 : -10);
    }
    const maxHoriz = Math.sqrt(Math.max(1.0, maxLegReach * maxLegReach - dy * dy));
    const minX = pX - Math.min(25.0, maxHoriz - 1.0);
    const maxX = pX + Math.min(25.0, maxHoriz - 1.0);
    return Math.max(minX, Math.min(maxX, desiredFootX));
  };

  for (let f = 0; f < 480; f++) {
    let actSection = 1;
    let sectionName = '1 — Barely Standing';

    if (f >= 48 && f <= 95) {
      actSection = 2;
      sectionName = '2 — First Lurch → Spinning Backhand';
    } else if (f >= 96 && f <= 143) {
      actSection = 3;
      sectionName = '3 — Near-Fall → Low Sweep';
    } else if (f >= 144 && f <= 203) {
      actSection = 4;
      sectionName = '4 — Backward Stagger → Spinning Back Kick';
    } else if (f >= 204 && f <= 263) {
      actSection = 5;
      sectionName = '5 — Impossible Lean → Whip Backhand → Hook Kick';
    } else if (f >= 264 && f <= 335) {
      actSection = 6;
      sectionName = '6 — Spin-Cycle Momentum Combo';
    } else if (f >= 336 && f <= 395) {
      actSection = 7;
      sectionName = '7 — Collapse → Pounce';
    } else if (f >= 396 && f <= 455) {
      actSection = 8;
      sectionName = '8 — Perfect Form';
    } else if (f >= 456) {
      actSection = 9;
      sectionName = '9 — Barely Standing Again (Loop)';
    }

    let sceneX = 420;
    let sceneY = 510;
    let facingRight = true;

    let rFootX = pinnedRFootX;
    let rFootY = G;
    let rFootPlanted = true;

    let lFootX = pinnedLFootX;
    let lFootY = G;
    let lFootPlanted = true;

    let spineLAngle = 90;
    let spineUAngle = 90;
    let neckAngle = 90;
    let headAngle = 90;

    let rArmSwing = -85;
    let rArmFlex = -85;
    let rHandAngle = -85;

    let lArmSwing = -95;
    let lArmFlex = -95;
    let lHandAngle = -95;

    let handTouchY: number | undefined = undefined;
    let isHitStop = false;
    let hitStopTargetX: number | undefined = undefined;
    let hitStopTargetY: number | undefined = undefined;
    let strikeName: string | undefined = undefined;

    let rHandIKTarget: { x: number; y: number } | null = null;
    let lHandIKTarget: { x: number; y: number } | null = null;
    let rFootIKTarget: { x: number; y: number } | null = null;
    let lFootIKTarget: { x: number; y: number } | null = null;

    const armJitter = (f % 2 === 0 ? 0.45 : -0.45);
    const breatheMicro = Math.sin(f * 0.85) * 2.8 + armJitter;

    // SECTION 1: F000-047 — BARELY STANDING
    if (f < 48) {
      sceneX = 420 + Math.sin(f * 0.2) * 10 + Math.cos(f * 0.08) * 6;
      sceneY = 510 + Math.abs(Math.sin(f * 0.15)) * 12;

      if (f >= 12 && f <= 19) {
        sceneX = 420 + (f - 12) * 2.5;
        rFootPlanted = false;
        rFootX = 435 + (f - 12) * 2;
        rFootY = f < 16 ? G - 12 : G;
        if (f === 19) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }
      } else {
        rFootX = pinnedRFootX;
      }

      if (f >= 32 && f <= 39) {
        sceneX = 437 - (f - 32) * 2.5;
        lFootPlanted = false;
        lFootX = 405 - (f - 32) * 2;
        lFootY = f < 36 ? G - 14 : G;
        if (f === 39) {
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          lFootX = pinnedLFootX;
          lFootPlanted = true;
        }
      } else {
        lFootX = pinnedLFootX;
      }

      spineLAngle = 65 + Math.sin(f * 0.22) * 15;
      spineUAngle = 60 + Math.sin(f * 0.22 + 0.3) * 15;

      if (f >= 40) {
        headAngle = 10;
        neckAngle = 20;
      } else {
        headAngle = 60 + Math.sin(f * 0.1) * 8;
        neckAngle = 65 + Math.sin(f * 0.1) * 8;
      }

      rArmSwing = -70 + Math.sin(f * 0.25) * 40 + breatheMicro;
      rArmFlex = rArmSwing + 25 + Math.cos(f * 0.2) * 30;
      rHandAngle = rArmFlex;

      lArmSwing = -110 - Math.cos(f * 0.25) * 40 - breatheMicro;
      lArmFlex = lArmSwing - 25 - Math.sin(f * 0.2) * 30;
      lHandAngle = lArmFlex;
    }

    // SECTION 2: F048-095 — FIRST LURCH → SPINNING BACKHAND
    else if (f >= 48 && f < 96) {
      if (f < 59) {
        const t = (f - 48) / 11;
        sceneX = 430 + t * 30;
        sceneY = 512 + Math.sin(t * Math.PI) * 18;
        spineLAngle = 55 - t * 20;
        spineUAngle = 50 - t * 20;

        rFootX = pinnedRFootX + t * 25;
        rFootY = t < 0.7 ? G - 16 : G;
        rFootPlanted = false;
        if (t >= 0.7 && f === 58) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }

        lFootPlanted = false;
        pinnedLFootX = clampFootToReach(sceneX, sceneY, pinnedLFootX, false);
        lFootX = pinnedLFootX;

        rArmSwing = -30 + t * 70 + breatheMicro;
        rArmFlex = rArmSwing + 30;
        rHandAngle = rArmFlex;
        lArmSwing = -130 - t * 40 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      } else if (f <= 67) {
        facingRight = true;
        const t = (f - 59) / 8;
        sceneX = 460 + t * 10;
        sceneY = 510;

        if (f === 59) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 475, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 435, false);
        }

        rFootX = pinnedRFootX;
        rFootY = G;
        if (f > 59) rFootPlanted = true;

        lFootX = pinnedLFootX;
        lFootY = G;
        if (f > 59) lFootPlanted = true;

        spineLAngle = 70 + t * 20;
        spineUAngle = 75 + t * 15;
        headAngle = 5;
        neckAngle = 10;

        if (f === 67) {
          isHitStop = true;
          strikeName = 'Spinning Backhand';
          hitStopTargetX = 610;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 610, y: 435 };
        } else {
          rHandIKTarget = { x: 520 + t * 90 + breatheMicro, y: 480 - t * 45 };
        }
      } else if (f <= 80) {
        const t = (f - 67) / 13;
        sceneX = 470 + t * 25;
        sceneY = 515 + Math.sin(t * Math.PI * 2) * 12;
        spineLAngle = 80 - t * 30;
        spineUAngle = 85 - t * 35;

        rFootPlanted = false;
        lFootPlanted = false;

        pinnedRFootX = clampFootToReach(sceneX, sceneY, sceneX + 15, true);
        rFootX = pinnedRFootX;

        lFootX = pinnedLFootX + t * 40;
        lFootY = Math.sin(t * Math.PI) > 0.3 ? G - 15 : G;
        if (lFootY >= G - 2 && f === 80) {
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          lFootX = pinnedLFootX;
          lFootPlanted = true;
        }

        rArmSwing = 40 - t * 110 + breatheMicro;
        rArmFlex = rArmSwing - 30;
        rHandAngle = rArmFlex;
      } else {
        const t = (f - 80) / 15;
        sceneX = 495 - t * 12;
        sceneY = 515;

        if (f === 81) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 510, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 475, false);
        }

        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;
        if (f > 81) {
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = -70 + Math.sin(f * 0.3) * 10 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -110 - Math.cos(f * 0.3) * 10 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 3: F096-143 — NEAR-FALL → LOW SWEEP
    else if (f >= 96 && f < 144) {
      if (f <= 107) {
        const t = (f - 96) / 11;
        sceneX = 483 - t * 25;
        sceneY = 515 + t * 115;
        spineLAngle = 45 - t * 40;
        spineUAngle = 40 - t * 45;

        handTouchY = G;
        lHandIKTarget = { x: sceneX - 45, y: G };

        rFootX = sceneX + 15;
        rFootY = G;
        lFootX = sceneX - 15;
        lFootY = G;
        rFootPlanted = false;
        lFootPlanted = false;
        if (t === 1.0) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          rFootX = pinnedRFootX;
          lFootX = pinnedLFootX;
          rFootPlanted = true;
          lFootPlanted = true;
        }
      } else if (f <= 119) {
        const t = (f - 108) / 11;
        sceneX = 458 + (f - 108) * 3;
        sceneY = 620 - (f - 108) * 5;
        spineLAngle = 25 + (f - 108) * 3;
        spineUAngle = 20 + (f - 108) * 4;

        if (f === 108) {
          lFootPlanted = false;
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 442, false);
        }
        lFootX = pinnedLFootX;
        lFootY = G;
        if (f > 108) lFootPlanted = true;

        rFootPlanted = false;

        lArmSwing = -100 + t * 30 + breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 113) {
          isHitStop = true;
          strikeName = 'Low Sweep Kick';
          hitStopTargetX = 580;
          hitStopTargetY = 740;
          rFootIKTarget = { x: 580, y: 740 };
        } else {
          rFootIKTarget = { x: 440 + t * 140, y: G - Math.sin(t * Math.PI) * 20 };
        }
      } else {
        const t = (f - 119) / 24;
        sceneX = 491 - t * 18;
        sceneY = 565 - t * 55;
        spineLAngle = 58 + t * 22;
        spineUAngle = 64 + t * 20;

        rFootX = 506 - t * 18;
        rFootY = G;
        rFootPlanted = false;
        if (t >= 0.9 && f === 143) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }

        if (f === 120) {
          lFootPlanted = false;
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 471, false);
        }
        lFootX = pinnedLFootX;
        if (f > 120) lFootPlanted = true;

        rArmSwing = -60 - t * 25 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -90 - t * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 4: F144-203 — BACKWARD STAGGER → SPINNING BACK KICK
    else if (f >= 144 && f < 204) {
      if (f <= 169) {
        const t = (f - 144) / 25;
        sceneX = 473 - t * 50;
        sceneY = 510 + Math.sin(t * Math.PI * 3) * 10;
        spineLAngle = 105 + Math.sin(t * Math.PI * 2) * 15;
        spineUAngle = 110 + Math.cos(t * Math.PI * 2) * 15;

        if (f === 144) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 488, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 458, false);
        }

        rFootX = pinnedRFootX - t * 45;
        rFootY = Math.sin(t * Math.PI * 3) > 0.3 ? G - 12 : G;
        rFootPlanted = false;
        if (rFootY >= G - 2 && f === 169) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }

        lFootX = pinnedLFootX - t * 45;
        lFootY = G;
        lFootPlanted = false;
        if (f === 169) {
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          lFootX = pinnedLFootX;
          lFootPlanted = true;
        }

        rArmSwing = -40 + Math.sin(f * 0.3) * 25 + breatheMicro;
        rArmFlex = rArmSwing + 30;
        rHandAngle = rArmFlex;
        lArmSwing = -100 - Math.sin(f * 0.3) * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      } else if (f <= 184) {
        const t = (f - 170) / 14;
        sceneX = 423 - t * 148;
        sceneY = 512;

        lFootPlanted = false;
        pinnedLFootX = clampFootToReach(sceneX, sceneY, sceneX - 12, false);
        lFootX = pinnedLFootX;
        lFootY = G;

        rFootPlanted = false;

        spineLAngle = 75 - t * 30;
        spineUAngle = 70 - t * 35;
        headAngle = 170;

        rArmSwing = -80 + t * 40 + breatheMicro;
        rArmFlex = rArmSwing - 30;
        rHandAngle = rArmFlex;
        lArmSwing = -120 - t * 30 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 184) {
          isHitStop = true;
          strikeName = 'Spinning Back Kick';
          hitStopTargetX = 500;
          hitStopTargetY = 520;
          rFootIKTarget = { x: 500, y: 520 };
        } else {
          rFootIKTarget = { x: 300 + t * 200, y: G - t * 220 };
        }
      } else {
        const t = (f - 184) / 19;
        sceneX = 275 + t * 185;
        sceneY = 512 + Math.sin(t * Math.PI) * 14;
        spineLAngle = 50 + t * 30;
        spineUAngle = 45 + t * 35;

        rFootX = sceneX + 20;
        rFootY = G;
        rFootPlanted = false;
        if (t >= 0.9 && f === 203) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }

        lFootPlanted = false;
        pinnedLFootX = clampFootToReach(sceneX, sceneY, sceneX - 12, false);
        lFootX = pinnedLFootX;

        rArmSwing = -50 + Math.cos(f * 0.3) * 15 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -100 - Math.sin(f * 0.3) * 15 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 5: F204-263 — IMPOSSIBLE LEAN → WHIP BACKHAND → HOOK KICK
    else if (f >= 204 && f < 264) {
      if (f <= 216) {
        const t = (f - 204) / 12;
        sceneX = 460 + t * 65;
        sceneY = 512 + t * 25;
        spineLAngle = 45 - t * 15;
        spineUAngle = 40 - t * 18;

        rFootPlanted = false;
        lFootPlanted = false;

        pinnedRFootX = clampFootToReach(sceneX, sceneY, 460 + t * 65 + 15, true);
        pinnedLFootX = clampFootToReach(sceneX, sceneY, 460 + t * 65 - 15, false);
        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;

        rArmSwing = 30 + Math.sin(f * 0.3) * 30 + breatheMicro;
        rArmFlex = rArmSwing - 40;
        rHandAngle = rArmFlex;
        lArmSwing = -140 - Math.cos(f * 0.3) * 30 - breatheMicro;
        lArmFlex = lArmSwing - 30;
        lHandAngle = lArmFlex;
      } else if (f <= 228) {
        const t = (f - 216) / 12;
        sceneX = 525 + t * 5;
        sceneY = 515;

        rFootX = pinnedRFootX + t * 30;
        rFootY = G;
        rFootPlanted = false;
        if (t >= 0.8 && f === 228) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          rFootX = pinnedRFootX;
          rFootPlanted = true;
        }

        if (f === 217) {
          lFootPlanted = false;
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 505, false);
        }
        lFootX = pinnedLFootX;
        if (f > 217) lFootPlanted = true;

        spineLAngle = 65 + t * 20;
        spineUAngle = 70 + t * 20;

        lArmSwing = -120 + t * 20 + breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 228) {
          isHitStop = true;
          strikeName = 'Whip Backhand';
          hitStopTargetX = 680;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 680, y: 435 };
        } else {
          rHandIKTarget = { x: 550 + t * 130 + breatheMicro, y: 500 - t * 65 };
        }
      } else if (f <= 246) {
        const t = (f - 228) / 18;
        sceneX = 530 - t * 65;
        sceneY = 515;

        if (f === 229) {
          rFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 545, true);
        }
        rFootPlanted = false;
        pinnedRFootX = clampFootToReach(sceneX, sceneY, pinnedRFootX, true);
        rFootX = pinnedRFootX;
        rFootY = G;

        lFootPlanted = false;

        spineLAngle = 80 - t * 25;
        spineUAngle = 85 - t * 30;

        rArmSwing = -60 + t * 20 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;

        if (f === 246) {
          isHitStop = true;
          strikeName = 'High Hook Kick';
          hitStopTargetX = 690;
          hitStopTargetY = 435;
          lFootIKTarget = { x: 690, y: 435 };
        } else {
          lFootIKTarget = { x: 480 + t * 210, y: G - t * 320 };
        }
      } else {
        const t = (f - 246) / 17;
        sceneX = 465 + t * 115;
        sceneY = 515;

        if (f === 247) {
          rFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 480, true);
        }
        rFootPlanted = false;
        pinnedRFootX = clampFootToReach(sceneX, sceneY, pinnedRFootX, true);
        rFootX = pinnedRFootX;

        lFootX = pinnedLFootX + t * 120;
        lFootY = G;
        lFootPlanted = false;
        if (t >= 0.9 && f === 263) {
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          lFootX = pinnedLFootX;
          lFootPlanted = true;
        }

        rArmSwing = -60 + Math.sin(f * 0.3) * 12 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -110 - Math.cos(f * 0.3) * 12 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 6: F264-335 — SPIN-CYCLE MOMENTUM COMBO
    else if (f >= 264 && f < 336) {
      if (f <= 281) {
        const t = (f - 264) / 17;
        sceneX = 580;
        sceneY = 515;

        if (f === 264) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 595, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 565, false);
        }

        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;
        if (f > 264) {
          rFootPlanted = true;
          lFootPlanted = true;
        }

        spineLAngle = 70 + t * 15;
        spineUAngle = 75 + t * 15;

        lArmSwing = -120 + t * 20 + breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 281) {
          isHitStop = true;
          strikeName = 'Combo Spin Backhand 1';
          hitStopTargetX = 730;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 730, y: 435 };
        } else {
          rHandIKTarget = { x: 600 + t * 130 + breatheMicro, y: 490 - t * 55 };
        }
      } else if (f <= 299) {
        const t = (f - 281) / 18;
        sceneX = 580 - t * 65;
        sceneY = 515;

        if (f === 282) {
          rFootPlanted = false;
        }
        rFootPlanted = false;
        pinnedRFootX = clampFootToReach(sceneX, sceneY, sceneX + 15, true);
        rFootX = pinnedRFootX;
        lFootPlanted = false;

        spineLAngle = 85 - t * 20;
        spineUAngle = 90 - t * 25;

        rArmSwing = -60 - t * 20 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;

        if (f === 299) {
          isHitStop = true;
          strikeName = 'Combo Spin Roundhouse';
          hitStopTargetX = 740;
          hitStopTargetY = 520;
          lFootIKTarget = { x: 740, y: 520 };
        } else {
          lFootIKTarget = { x: 530 + t * 210, y: G - t * 235 };
        }
      } else if (f <= 316) {
        const t = (f - 299) / 17;
        sceneX = 515 + t * 85;
        sceneY = 515;

        if (f === 300) {
          rFootPlanted = false;
        }
        rFootPlanted = false;
        pinnedRFootX = clampFootToReach(sceneX, sceneY, sceneX + 15, true);
        rFootX = pinnedRFootX;

        lFootX = pinnedLFootX + t * 30;
        lFootY = G;
        lFootPlanted = false;
        if (t >= 0.9 && f === 316) {
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          lFootX = pinnedLFootX;
          lFootPlanted = true;
        }

        spineLAngle = 65 + t * 25;
        spineUAngle = 65 + t * 25;

        lArmSwing = -110 - t * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 316) {
          isHitStop = true;
          strikeName = 'Combo Spin Backhand 2';
          hitStopTargetX = 750;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 750, y: 435 };
        } else {
          rHandIKTarget = { x: 500 + t * 250, y: 480 - t * 45 };
        }
      } else {
        const t = (f - 316) / 19;
        sceneX = 600 - t * 45;
        sceneY = 515 + Math.sin(t * Math.PI) * 15;
        spineLAngle = 90 - Math.sin(t * Math.PI) * 35;
        spineUAngle = 95 - Math.sin(t * Math.PI) * 40;

        rFootPlanted = false;
        lFootPlanted = false;
        rFootX = sceneX + 15;
        lFootX = sceneX - 15;

        if (t >= 0.9 && f === 335) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          rFootX = pinnedRFootX;
          lFootX = pinnedLFootX;
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = 20 - t * 90 + Math.sin(f * 0.3) * 15 + breatheMicro;
        rArmFlex = rArmSwing - 30;
        rHandAngle = rArmFlex;
        lArmSwing = -80 - Math.sin(f * 0.3) * 15 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 7: F336-395 — COLLAPSE → POUNCE
    else if (f >= 336 && f < 396) {
      if (f <= 367) {
        const t = (f - 336) / 31;
        sceneX = 555 + Math.sin(t * Math.PI * 2) * 15;
        sceneY = 515 + t * 110;
        spineLAngle = 55 - t * 25;
        spineUAngle = 50 - t * 30;

        if (f === 336) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = 570;
          pinnedLFootX = 540;
        }

        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;
        if (f > 336) {
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = -40 - t * 50 + Math.sin(f * 0.3) * 10 + breatheMicro;
        rArmFlex = rArmSwing - 30;
        rHandAngle = rArmFlex;
        lArmSwing = -90 - t * 30 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      } else if (f <= 375) {
        const t = (f - 367) / 8;
        sceneX = 555 + t * 15;
        sceneY = 625 - t * 115;

        rFootPlanted = false;
        lFootPlanted = false;

        rFootX = pinnedRFootX + t * 15;
        lFootX = pinnedLFootX + t * 15;

        if (t === 1.0) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
        }

        spineLAngle = 30 + t * 60;
        spineUAngle = 20 + t * 70;

        lArmSwing = -80 + t * 40 + breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 368) {
          isHitStop = true;
          strikeName = 'Rising Palm Strike';
          hitStopTargetX = 720;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 720, y: 435 };
        } else {
          rHandIKTarget = { x: 570 + t * 150, y: 550 - t * 115 };
        }
      } else if (f <= 384) {
        const t = (f - 375) / 9;
        sceneX = 570 - t * 15;
        sceneY = 510 - Math.sin(t * Math.PI) * 45;

        lFootX = pinnedLFootX + t * 35;
        lFootY = G - Math.sin(t * Math.PI) * 30;
        lFootPlanted = false;

        rFootPlanted = false;

        spineLAngle = 85 + t * 5;
        spineUAngle = 90 + t * 5;

        rArmSwing = -40 - t * 20 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -110 - t * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;

        if (f === 384) {
          isHitStop = true;
          strikeName = 'Flying Side Kick';
          hitStopTargetX = 780;
          hitStopTargetY = 520;
          rFootIKTarget = { x: 780, y: 520 };
        } else {
          rFootIKTarget = { x: 570 + t * 210, y: G - t * 235 };
        }
      } else {
        const t = (f - 384) / 11;
        sceneX = 555 + t * 185;
        sceneY = 510 + Math.sin(t * Math.PI) * 25;
        spineLAngle = 90 - t * 25;
        spineUAngle = 95 - t * 30;

        rFootX = 740;
        rFootY = G;
        rFootPlanted = false;
        pinnedRFootX = 740;

        lFootX = 690;
        lFootY = G;
        lFootPlanted = false;
        pinnedLFootX = 690;

        if (f >= 388) {
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = -60 - t * 20 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -110 + t * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 8: F396-455 — PERFECT FORM
    else if (f >= 396 && f < 456) {
      if (f <= 414) {
        const t = Math.min(1.0, (f - 396) / 4);
        sceneX = 740 - t * 80;
        sceneY = 510;
        spineLAngle = 65 + t * 25;
        spineUAngle = 65 + t * 25;
        headAngle = 0;
        neckAngle = 0;

        rFootX = sceneX + 25;
        lFootX = sceneX - 25;
        rFootPlanted = false;
        lFootPlanted = false;
        if (t === 1.0) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          rFootX = pinnedRFootX;
          lFootX = pinnedLFootX;
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = -10 + t * 10 + breatheMicro;
        rArmFlex = -20 + breatheMicro;
        rHandAngle = breatheMicro;

        lArmSwing = -110 + breatheMicro;
        lArmFlex = -160 + breatheMicro;
        lHandAngle = -160 + breatheMicro;
      } else if (f <= 420) {
        sceneX = 660;
        sceneY = 510;
        spineLAngle = 90;
        spineUAngle = 90;

        if (f === 415) {
          rFootPlanted = false;
          lFootPlanted = false;
          pinnedRFootX = clampFootToReach(sceneX, sceneY, 685, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 635, false);
        }

        pinnedRFootX = clampFootToReach(sceneX, sceneY, pinnedRFootX, true);
        pinnedLFootX = clampFootToReach(sceneX, sceneY, pinnedLFootX, false);
        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;
        if (f > 415) {
          rFootPlanted = true;
          lFootPlanted = true;
        }

        lArmSwing = -110 + breatheMicro;
        lArmFlex = -160 + breatheMicro;
        lHandAngle = -160 + breatheMicro;

        if (f === 418 || f === 419) {
          isHitStop = true;
          strikeName = 'Perfect Straight Palm';
          hitStopTargetX = 810;
          hitStopTargetY = 435;
          rHandIKTarget = { x: 810, y: 435 };
        } else {
          const t = (f - 414) / 4;
          rHandIKTarget = { x: 660 + t * 150, y: 480 - t * 45 };
        }
      } else if (f <= 438) {
        sceneX = 660 - (f - 420) * 3.0;
        sceneY = 510;
        spineLAngle = 90;
        spineUAngle = 90;

        if (f === 421) {
          lFootPlanted = false;
          pinnedLFootX = clampFootToReach(sceneX, sceneY, 580, false);
        }
        pinnedLFootX = clampFootToReach(sceneX, sceneY, pinnedLFootX, false);
        lFootX = pinnedLFootX;
        lFootY = G;
        if (f > 421) lFootPlanted = true;

        rFootPlanted = false;

        lArmSwing = -110 + breatheMicro;
        lArmFlex = -160 + breatheMicro;
        lHandAngle = -160 + breatheMicro;

        if (f === 436 || f === 437) {
          isHitStop = true;
          strikeName = 'Perfect Side Kick';
          hitStopTargetX = 830;
          hitStopTargetY = 520;
          rFootIKTarget = { x: 830, y: 520 };
        } else {
          const t = (f - 420) / 16;
          rFootIKTarget = { x: 600 + t * 230, y: G - t * 235 };
        }
      } else {
        const t = (f - 438) / 17;
        sceneX = 605 + t * 35;
        sceneY = 510 + Math.sin(t * Math.PI) * 12;
        spineLAngle = 90 - t * 25;
        spineUAngle = 90 - t * 30;

        rFootX = pinnedRFootX + t * 35;
        rFootY = G;
        rFootPlanted = false;

        lFootX = pinnedLFootX + t * 35;
        lFootY = G;
        lFootPlanted = false;

        if (t === 1.0) {
          pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
          pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
          rFootX = pinnedRFootX;
          lFootX = pinnedLFootX;
          rFootPlanted = true;
          lFootPlanted = true;
        }

        rArmSwing = 0 - t * 70 + Math.sin(f * 0.3) * 10 + breatheMicro;
        rArmFlex = rArmSwing - 20;
        rHandAngle = rArmFlex;
        lArmSwing = -110 + t * 20 - breatheMicro;
        lArmFlex = lArmSwing - 20;
        lHandAngle = lArmFlex;
      }
    }

    // SECTION 9: F456-479 — BARELY STANDING AGAIN (LOOPING)
    else {
      const t = (f - 456) / 23;
      const startX = 640;
      sceneX = startX + (420 - startX) * t + Math.sin(t * Math.PI * 2) * 8;
      sceneY = 510 + Math.sin(t * Math.PI) * 10;

      rFootX = sceneX + 15;
      rFootY = G;
      rFootPlanted = false;

      lFootX = sceneX - 15;
      lFootY = G;
      lFootPlanted = false;

      if (t === 1.0) {
        pinnedRFootX = clampFootToReach(sceneX, sceneY, rFootX, true);
        pinnedLFootX = clampFootToReach(sceneX, sceneY, lFootX, false);
        rFootX = pinnedRFootX;
        lFootX = pinnedLFootX;
        rFootPlanted = true;
        lFootPlanted = true;
      }

      spineLAngle = 65 + Math.sin(f * 0.2) * 10;
      spineUAngle = 60 + Math.sin(f * 0.2 + 0.3) * 10;

      headAngle = 60 + Math.sin(f * 0.1) * 8;
      neckAngle = 65 + Math.sin(f * 0.1) * 8;

      rArmSwing = -70 + Math.sin(f * 0.25) * 30 + breatheMicro;
      rArmFlex = rArmSwing + 25;
      rHandAngle = rArmFlex;

      lArmSwing = -110 - Math.cos(f * 0.25) * 30 - breatheMicro;
      lArmFlex = lArmSwing - 25;
      lHandAngle = lArmFlex;
    }

    // Ensure feet remain strictly pinned when planted
    if (rFootPlanted) {
      rFootX = pinnedRFootX;
      rFootY = G;
    }
    if (lFootPlanted) {
      lFootX = pinnedLFootX;
      lFootY = G;
    }

    // Calculate 17 world angles using FK / IK solvers
    const worldAngles = new Array(17).fill(0);
    worldAngles[0] = facingRight ? -90 : 90;

    // Solve Legs
    if (rFootIKTarget) {
      rFootPlanted = false;
      const footOffset = 26.75;
      const targetAnkleX = facingRight ? rFootIKTarget.x - footOffset : rFootIKTarget.x + footOffset;
      const rLeg = solveLegLimb(sceneX, sceneY, targetAnkleX, rFootIKTarget.y, facingRight, scale, false);
      worldAngles[1] = rLeg.thighAngleDeg;
      worldAngles[2] = rLeg.shinAngleDeg;
      worldAngles[3] = rLeg.footAngleDeg;
    } else {
      const rLeg = solveLegLimb(sceneX, sceneY, rFootX, rFootY, facingRight, scale, rFootPlanted);
      worldAngles[1] = rLeg.thighAngleDeg;
      worldAngles[2] = rLeg.shinAngleDeg;
      worldAngles[3] = rLeg.footAngleDeg;
    }

    if (lFootIKTarget) {
      lFootPlanted = false;
      const footOffset = 26.75;
      const targetAnkleX = facingRight ? lFootIKTarget.x - footOffset : lFootIKTarget.x + footOffset;
      const lLeg = solveLegLimb(sceneX, sceneY, targetAnkleX, lFootIKTarget.y, facingRight, scale, false);
      worldAngles[4] = lLeg.thighAngleDeg;
      worldAngles[5] = lLeg.shinAngleDeg;
      worldAngles[6] = lLeg.footAngleDeg;
    } else {
      const lLeg = solveLegLimb(sceneX, sceneY, lFootX, lFootY, facingRight, scale, lFootPlanted);
      worldAngles[4] = lLeg.thighAngleDeg;
      worldAngles[5] = lLeg.shinAngleDeg;
      worldAngles[6] = lLeg.footAngleDeg;
    }

    // Spine & Neck
    worldAngles[7] = spineLAngle;
    worldAngles[8] = spineUAngle;
    worldAngles[12] = neckAngle;
    worldAngles[13] = headAngle;

    // Solve Arms
    if (rHandIKTarget) {
      const testFK = solveForwardKinematics17(sceneX, sceneY, worldAngles, scale);
      const shoulderX = testFK[8].endX;
      const shoulderY = testFK[8].endY;
      const handOffset = 8.1;
      const targetWristX = rHandIKTarget.x - handOffset;
      const rArm = solveArmLimb(shoulderX, shoulderY, targetWristX, rHandIKTarget.y, facingRight, scale);
      worldAngles[9] = rArm.bicepAngleDeg;
      worldAngles[10] = rArm.forearmAngleDeg;
      worldAngles[11] = rArm.handAngleDeg;
    } else {
      worldAngles[9] = rArmSwing;
      worldAngles[10] = rArmFlex;
      worldAngles[11] = rHandAngle;
    }

    if (lHandIKTarget) {
      const testFK = solveForwardKinematics17(sceneX, sceneY, worldAngles, scale);
      const shoulderX = testFK[8].endX;
      const shoulderY = testFK[8].endY;
      const handOffset = 8.1;
      const targetWristX = lHandIKTarget.x - handOffset;
      const lArm = solveArmLimb(shoulderX, shoulderY, targetWristX, lHandIKTarget.y, facingRight, scale);
      worldAngles[14] = lArm.bicepAngleDeg;
      worldAngles[15] = lArm.forearmAngleDeg;
      worldAngles[16] = lArm.handAngleDeg;
    } else {
      worldAngles[14] = lArmSwing;
      worldAngles[15] = lArmFlex;
      worldAngles[16] = lHandAngle;
    }

    // Compute full FK pose & COM / BoS metrics
    const com = calculateCenterOfMass17(sceneX, sceneY, worldAngles, scale);
    const bos = calculateBaseOfSupport17(sceneX, sceneY, worldAngles, G, scale, com.comX);

    const comMarginPx = com.comX >= bos.minX && com.comX <= bos.maxX
      ? Math.min(com.comX - bos.minX, bos.maxX - com.comX)
      : -Math.min(Math.abs(com.comX - bos.minX), Math.abs(com.comX - bos.maxX));

    const comExitsBoS = !bos.isStaticallyBalanced || comMarginPx < -18;
    const headAngleErrDeg = Math.abs(headAngle - 0);

    let camZoom = 1.0;
    let camX = sceneX - 640;
    let camY = sceneY - 510;

    if (isHitStop) {
      camZoom = 1.05;
    }

    frames.push({
      frame: f,
      actSection,
      sectionName,
      sceneX,
      sceneY,
      worldAngles,
      camX,
      camY,
      camZoom,
      isHitStop,
      hitStopTargetX,
      hitStopTargetY,
      strikeName,
      comX: com.comX,
      comY: com.comY,
      supportMinX: bos.minX,
      supportMaxX: bos.maxX,
      isStumbling: comExitsBoS,
      comExitsBoS,
      comMarginPx,
      facingRight,
      headAngleErrDeg,
      rFootPlanted,
      lFootPlanted,
      rFootX,
      rFootY,
      lFootX,
      lFootY,
      handTouchY,
    });
  }

  return frames;
}

import { Pose17 } from './types';
import { computeForwardKinematics17, getAnatomicalLandmarks } from './forwardKinematics';
import { PHYSICS_CONFIG } from './config';

export interface ValidationMetricResult {
  name: string;
  passed: boolean;
  measuredValue: number;
  threshold: number;
  unit: string;
  worstOffendingFrame: number | null;
  detail: string;
}

export interface ValidationContext {
  groundY?: number;
  strikeEvent?: {
    frame: number;
    attackerHandOrFoot: 'rightHand' | 'leftHand' | 'rightFoot' | 'leftFoot';
    defenderAnchor: 'chest' | 'head' | 'leftForearm' | 'rightForearm';
    defenderPose: Pose17;
  };
  cameraData?: {
    camX: number;
    camY: number;
    camZoom: number;
  }[];
}

export interface QuantitativeValidationReport {
  overallPassed: boolean;
  totalFrames: number;
  metrics: {
    boneLengthDrift: ValidationMetricResult;
    footContactAndSlide: ValidationMetricResult;
    rootTeleport: ValidationMetricResult;
    velocityJerkSpikes: ValidationMetricResult;
    strikeReach?: ValidationMetricResult;
    jumpLandingHeight?: ValidationMetricResult;
    cameraDecoupling: ValidationMetricResult;
  };
  diagnostics: string[];
}

/**
 * Executes comprehensive quantitative biomechanical validation on an animated frame sequence.
 * Every check returns concrete numbers and pinpoints the worst offending frame.
 */
export function validateMotionSequence(
  frames: Pose17[],
  context: ValidationContext = {}
): QuantitativeValidationReport {
  const n = frames.length;
  const groundY = context.groundY ?? PHYSICS_CONFIG.environment.defaultGroundY;
  const tol = PHYSICS_CONFIG.tolerances;
  const { boneLengths } = PHYSICS_CONFIG.skeleton;
  const diagnostics: string[] = [];

  if (n === 0) {
    return {
      overallPassed: false,
      totalFrames: 0,
      metrics: {
        boneLengthDrift: {
          name: 'Bone-length Drift',
          passed: false,
          measuredValue: 0,
          threshold: tol.maxBoneLengthDriftPx,
          unit: 'px',
          worstOffendingFrame: null,
          detail: 'No frames provided',
        },
        footContactAndSlide: {
          name: 'Foot Contact & Slide',
          passed: false,
          measuredValue: 0,
          threshold: tol.maxStanceFootSlipPx,
          unit: 'px',
          worstOffendingFrame: null,
          detail: 'No frames provided',
        },
        rootTeleport: {
          name: 'Root Teleport Spike',
          passed: false,
          measuredValue: 0,
          threshold: tol.maxRootTeleportStepPx,
          unit: 'px/f',
          worstOffendingFrame: null,
          detail: 'No frames provided',
        },
        velocityJerkSpikes: {
          name: 'Velocity & Jerk Spikes',
          passed: false,
          measuredValue: 0,
          threshold: tol.maxJointAngularStepDeg,
          unit: 'deg/f',
          worstOffendingFrame: null,
          detail: 'No frames provided',
        },
        cameraDecoupling: {
          name: 'Camera Decoupling',
          passed: true,
          measuredValue: 0,
          threshold: 0,
          unit: 'score',
          worstOffendingFrame: null,
          detail: 'No camera data',
        },
      },
      diagnostics: ['Frame sequence is empty'],
    };
  }

  // 1. Bone-length drift
  let maxBoneDrift = 0;
  let worstBoneFrame: number | null = null;
  let worstBoneIndex = -1;

  for (let f = 0; f < n; f++) {
    const pose = frames[f];
    const joints = computeForwardKinematics17(pose);
    for (let b = 0; b < 17; b++) {
      const expectedLen = boneLengths[b] * pose.scale;
      const measuredLen = Math.hypot(
        joints[b].endX - joints[b].startX,
        joints[b].endY - joints[b].startY
      );
      const drift = Math.abs(measuredLen - expectedLen);
      if (drift > maxBoneDrift) {
        maxBoneDrift = drift;
        worstBoneFrame = f;
        worstBoneIndex = b;
      }
    }
  }

  const bonePassed = maxBoneDrift <= tol.maxBoneLengthDriftPx;
  if (!bonePassed) {
    diagnostics.push(
      `Bone length drift failed: max drift of ${maxBoneDrift.toFixed(3)}px on bone ${worstBoneIndex} at frame ${worstBoneFrame}.`
    );
  }

  // 2. Foot contact & slide
  let maxElevationError = 0;
  let maxFootSlip = 0;
  let worstElevationFrame: number | null = null;
  let worstSlipFrame: number | null = null;

  for (let f = 0; f < n; f++) {
    const pose = frames[f];
    const joints = computeForwardKinematics17(pose);
    const rFootY = joints[3].endY;
    const lFootY = joints[6].endY;

    // Sinking below ground is an absolute violation
    if (rFootY > groundY + 0.5) {
      const err = rFootY - groundY;
      if (err > maxElevationError) {
        maxElevationError = err;
        worstElevationFrame = f;
      }
    }
    if (lFootY > groundY + 0.5) {
      const err = lFootY - groundY;
      if (err > maxElevationError) {
        maxElevationError = err;
        worstElevationFrame = f;
      }
    }

    // Measure stance foot slide
    if (f > 0) {
      const prevPose = frames[f - 1];
      const prevJoints = computeForwardKinematics17(prevPose);

      // If right foot was grounded in both frames
      if (Math.abs(rFootY - groundY) < 2.0 && Math.abs(prevJoints[3].endY - groundY) < 2.0) {
        const slip = Math.abs(joints[3].endX - prevJoints[3].endX);
        if (slip > maxFootSlip) {
          maxFootSlip = slip;
          worstSlipFrame = f;
        }
      }

      // If left foot was grounded in both frames
      if (Math.abs(lFootY - groundY) < 2.0 && Math.abs(prevJoints[6].endY - groundY) < 2.0) {
        const slip = Math.abs(joints[6].endX - prevJoints[6].endX);
        if (slip > maxFootSlip) {
          maxFootSlip = slip;
          worstSlipFrame = f;
        }
      }
    }
  }

  const footPassed =
    maxElevationError <= tol.maxGroundElevationErrorPx &&
    maxFootSlip <= tol.maxStanceFootSlipPx;
  if (!footPassed) {
    diagnostics.push(
      `Foot grounding/slip failed: elevation error ${maxElevationError.toFixed(2)}px (worst frame ${worstElevationFrame}), slip ${maxFootSlip.toFixed(2)}px (worst frame ${worstSlipFrame}).`
    );
  }

  // 3. Root teleport check
  let maxRootDelta = 0;
  let worstRootFrame: number | null = null;

  for (let f = 1; f < n; f++) {
    const dx = frames[f].rootX - frames[f - 1].rootX;
    const dy = frames[f].rootY - frames[f - 1].rootY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRootDelta) {
      maxRootDelta = dist;
      worstRootFrame = f;
    }
  }

  const rootPassed = maxRootDelta <= tol.maxRootTeleportStepPx;
  if (!rootPassed) {
    diagnostics.push(
      `Root teleport failed: single-frame leap of ${maxRootDelta.toFixed(1)}px at frame ${worstRootFrame} (limit: ${tol.maxRootTeleportStepPx}px).`
    );
  }

  // 4. Velocity and Jerk spikes
  let maxJointDelta = 0;
  let maxJointJerk = 0;
  let worstVelocityFrame: number | null = null;
  let worstJerkFrame: number | null = null;

  for (let f = 1; f < n; f++) {
    for (let j = 0; j < 17; j++) {
      let d1 = Math.abs(frames[f].angles[j] - frames[f - 1].angles[j]) % 360;
      if (d1 > 180) d1 = 360 - d1;
      if (d1 > maxJointDelta) {
        maxJointDelta = d1;
        worstVelocityFrame = f;
      }

      if (f > 1) {
        let d0 = Math.abs(frames[f - 1].angles[j] - frames[f - 2].angles[j]) % 360;
        if (d0 > 180) d0 = 360 - d0;
        const jerk = Math.abs(d1 - d0);
        if (jerk > maxJointJerk) {
          maxJointJerk = jerk;
          worstJerkFrame = f;
        }
      }
    }
  }

  const velocityPassed = maxJointDelta <= tol.maxJointAngularStepDeg;
  if (!velocityPassed) {
    diagnostics.push(
      `Joint velocity failed: peak step of ${maxJointDelta.toFixed(1)}°/f at frame ${worstVelocityFrame} (limit: ${tol.maxJointAngularStepDeg}°/f).`
    );
  }

  // 5. Strike Reach (optional if context has strikeEvent)
  let strikeMetric: ValidationMetricResult | undefined;
  if (context.strikeEvent) {
    const ef = context.strikeEvent.frame;
    if (ef < n) {
      const attJoints = computeForwardKinematics17(frames[ef]);
      const defJoints = computeForwardKinematics17(context.strikeEvent.defenderPose);

      let attEffector = { x: attJoints[11].endX, y: attJoints[11].endY }; // Right hand
      if (context.strikeEvent.attackerHandOrFoot === 'leftHand') {
        attEffector = { x: attJoints[16].endX, y: attJoints[16].endY };
      } else if (context.strikeEvent.attackerHandOrFoot === 'rightFoot') {
        attEffector = { x: attJoints[3].endX, y: attJoints[3].endY };
      } else if (context.strikeEvent.attackerHandOrFoot === 'leftFoot') {
        attEffector = { x: attJoints[6].endX, y: attJoints[6].endY };
      }

      let defAnchor = { x: defJoints[8].endX, y: defJoints[8].endY }; // Chest
      if (context.strikeEvent.defenderAnchor === 'head') {
        defAnchor = { x: defJoints[13].endX, y: defJoints[13].endY };
      } else if (context.strikeEvent.defenderAnchor === 'leftForearm') {
        defAnchor = {
          x: (defJoints[15].startX + defJoints[15].endX) * 0.5,
          y: (defJoints[15].startY + defJoints[15].endY) * 0.5,
        };
      } else if (context.strikeEvent.defenderAnchor === 'rightForearm') {
        defAnchor = {
          x: (defJoints[10].startX + defJoints[10].endX) * 0.5,
          y: (defJoints[10].startY + defJoints[10].endY) * 0.5,
        };
      }

      const dist = Math.hypot(attEffector.x - defAnchor.x, attEffector.y - defAnchor.y);
      const strikePassed = dist <= tol.warningContactThresholdPx;
      if (!strikePassed) {
        diagnostics.push(
          `Strike reach failed: gap of ${dist.toFixed(1)}px at impact frame ${ef} (limit: ${tol.warningContactThresholdPx}px).`
        );
      }

      strikeMetric = {
        name: 'Strike Contact Precision',
        passed: strikePassed,
        measuredValue: dist,
        threshold: tol.warningContactThresholdPx,
        unit: 'px',
        worstOffendingFrame: ef,
        detail: `Attacker-to-defender distance at clash frame ${ef}: ${dist.toFixed(1)}px.`,
      };
    }
  }

  // 6. Jump Landing Surface Continuity (checks if airborne phases land on takeoff surface)
  let jumpMetric: ValidationMetricResult | undefined;
  let lastGroundedFootY = groundY;
  let takeoffY: number | null = null;
  let landingY: number | null = null;
  let inFlight = false;
  let maxJumpLandingDelta = 0;
  let worstLandingFrame: number | null = null;

  for (let f = 0; f < n; f++) {
    const pose = frames[f];
    const joints = computeForwardKinematics17(pose);
    const lowestFootY = Math.max(joints[3].endY, joints[6].endY);
    const isAirborne = lowestFootY < groundY - 25.0;

    if (!inFlight && lowestFootY >= groundY - 3.0) {
      lastGroundedFootY = lowestFootY;
    }

    if (isAirborne && !inFlight) {
      // Just left the ground
      inFlight = true;
      takeoffY = lastGroundedFootY;
    } else if (inFlight && lowestFootY >= groundY - 3.0) {
      // Touchdown contact with landing surface
      inFlight = false;
      landingY = lowestFootY;
      if (takeoffY !== null) {
        const delta = Math.abs(landingY - takeoffY);
        if (delta > maxJumpLandingDelta) {
          maxJumpLandingDelta = delta;
          worstLandingFrame = f;
        }
      }
    }
  }

  if (takeoffY !== null && landingY !== null) {
    const jumpPassed = maxJumpLandingDelta <= tol.maxGroundElevationErrorPx;
    if (!jumpPassed) {
      diagnostics.push(
        `Jump landing height mismatch: takeoff Y=${takeoffY.toFixed(1)}, landing Y=${landingY.toFixed(1)} (delta: ${maxJumpLandingDelta.toFixed(1)}px at frame ${worstLandingFrame}).`
      );
    }
    jumpMetric = {
      name: 'Jump Landing Elevation Match',
      passed: jumpPassed,
      measuredValue: maxJumpLandingDelta,
      threshold: tol.maxGroundElevationErrorPx,
      unit: 'px',
      worstOffendingFrame: worstLandingFrame,
      detail: `Takeoff elevation: ${takeoffY.toFixed(1)}px, Landing elevation: ${landingY.toFixed(1)}px.`,
    };
  }

  // 7. Camera Decoupling Check
  let cameraPassed = true;
  let camMetricDetail = 'Camera isolated from world coordinates.';
  let worstCamFrame: number | null = null;

  if (context.cameraData && context.cameraData.length === n) {
    for (let f = 1; f < n; f++) {
      const dCamX = Math.abs(context.cameraData[f].camX - context.cameraData[f - 1].camX);
      const dRootX = Math.abs(frames[f].rootX - frames[f - 1].rootX);
      // If camera moved significantly and character world root jumped by the exact same amount in lockstep
      if (dCamX > 10.0 && Math.abs(dCamX - dRootX) < 0.1) {
        cameraPassed = false;
        worstCamFrame = f;
        camMetricDetail = `Camera movement baked into character world coordinates at frame ${f}.`;
        diagnostics.push(camMetricDetail);
        break;
      }
    }
  }

  const cameraMetric: ValidationMetricResult = {
    name: 'Camera Decoupling',
    passed: cameraPassed,
    measuredValue: cameraPassed ? 1 : 0,
    threshold: 1,
    unit: 'bool',
    worstOffendingFrame: worstCamFrame,
    detail: camMetricDetail,
  };

  const overallPassed =
    bonePassed &&
    footPassed &&
    rootPassed &&
    velocityPassed &&
    (strikeMetric ? strikeMetric.passed : true) &&
    (jumpMetric ? jumpMetric.passed : true) &&
    cameraPassed;

  return {
    overallPassed,
    totalFrames: n,
    metrics: {
      boneLengthDrift: {
        name: 'Bone-length Drift',
        passed: bonePassed,
        measuredValue: maxBoneDrift,
        threshold: tol.maxBoneLengthDriftPx,
        unit: 'px',
        worstOffendingFrame: worstBoneFrame,
        detail: `Max measured bone drift: ${maxBoneDrift.toFixed(4)}px (limit: ${tol.maxBoneLengthDriftPx}px).`,
      },
      footContactAndSlide: {
        name: 'Foot Contact & Slide',
        passed: footPassed,
        measuredValue: Math.max(maxElevationError, maxFootSlip),
        threshold: tol.maxStanceFootSlipPx,
        unit: 'px',
        worstOffendingFrame: worstSlipFrame ?? worstElevationFrame,
        detail: `Max elevation error: ${maxElevationError.toFixed(2)}px, max foot slip: ${maxFootSlip.toFixed(2)}px.`,
      },
      rootTeleport: {
        name: 'Root Teleport Spike',
        passed: rootPassed,
        measuredValue: maxRootDelta,
        threshold: tol.maxRootTeleportStepPx,
        unit: 'px/f',
        worstOffendingFrame: worstRootFrame,
        detail: `Max single-frame root step: ${maxRootDelta.toFixed(1)}px (limit: ${tol.maxRootTeleportStepPx}px).`,
      },
      velocityJerkSpikes: {
        name: 'Velocity & Jerk Spikes',
        passed: velocityPassed,
        measuredValue: maxJointDelta,
        threshold: tol.maxJointAngularStepDeg,
        unit: 'deg/f',
        worstOffendingFrame: worstVelocityFrame,
        detail: `Peak joint velocity: ${maxJointDelta.toFixed(1)}°/f (limit: ${tol.maxJointAngularStepDeg}°/f), peak jerk: ${maxJointJerk.toFixed(1)}°/f².`,
      },
      ...(strikeMetric ? { strikeReach: strikeMetric } : {}),
      ...(jumpMetric ? { jumpLandingHeight: jumpMetric } : {}),
      cameraDecoupling: cameraMetric,
    },
    diagnostics,
  };
}

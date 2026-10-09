import physicsConfig from '../../config/physics.json';

export interface PhysicsConfig {
  environment: {
    defaultGroundY: number;
    gravityPxPerSec2: number;
    groundFriction: number;
    restitution: number;
    airResistance: number;
  };
  timing: {
    standardFps: number;
    cinematicFps: number;
    defaultTweenValue: number;
    animateOnTwos: boolean;
  };
  locomotion: {
    walkStrideLengthPx: number;
    walkStepDurationSec: number;
    pelvisWaveDipPx: number;
    runStrideLengthPx: number;
    jumpApexHeightPx: number;
    landingCompressionDipPx: number;
    torsoForwardLeanDeg: number;
  };
  bounce: {
    ballDiameter: number;
    ballThickness: number;
    primaryApexHeight: number;
    secondaryApexHeight: number;
    squashFactor: number;
  };
  tolerances: {
    contactThresholdPx: number;
    strictContactThresholdPx: number;
    warningContactThresholdPx: number;
    maxStanceFootSlipPx: number;
    maxGroundElevationErrorPx: number;
    maxRootTeleportStepPx: number;
    maxJointAngularStepDeg: number;
    maxBoneLengthDriftPx: number;
    hitStopFreezeFrames: number;
    recoilSlideDistancePx: number;
    balanceMarginThresholdPx: number;
  };
  skeleton: {
    nodeCount: number;
    defaultScale: number;
    parents: number[];
    boneLengths: number[];
    boneThickness: number[];
    boneNames: string[];
  };
}

export const PHYSICS_CONFIG: PhysicsConfig = physicsConfig as PhysicsConfig;
export default PHYSICS_CONFIG;

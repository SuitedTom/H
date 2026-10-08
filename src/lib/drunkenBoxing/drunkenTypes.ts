export interface DrunkenGeneratorConfig {
  projectName: string;
  targetFps: 24;
  groundY: number; // default 755.0
  manColorHex: string; // default '#0F172A'
  scale: number; // default 0.5
}

export interface DrunkenKeyframeSpec {
  frame: number;
  actSection: number; // 1..9
  sectionName: string;
  sceneX: number; // Pelvis X
  sceneY: number; // Pelvis Y
  worldAngles: number[]; // 17 world angles for stickfigure
  camX?: number;
  camY?: number;
  camZoom?: number;
  // Biomechanical & telemetry attributes
  isHitStop?: boolean;
  hitStopTargetX?: number;
  hitStopTargetY?: number;
  strikeName?: string;
  comX: number;
  comY: number;
  supportMinX: number;
  supportMaxX: number;
  isStumbling: boolean;
  comExitsBoS: boolean;
  comMarginPx: number; // positive = inside BoS, negative = distance outside BoS
  facingRight: boolean;
  headAngleErrDeg: number;
  rFootPlanted: boolean;
  lFootPlanted: boolean;
  rFootX: number;
  rFootY: number;
  lFootX: number;
  lFootY: number;
  handTouchY?: number;
}

export interface ContactEventSpec {
  frame: number;
  section: number;
  name: string;
  targetX: number;
  targetY: number;
  targetName: string;
  effectorBoneIndex: number; // 11 (R hand), 16 (L hand), 3 (R foot), 6 (L foot)
  effectorName: string;
  maxDistancePx: number; // <= 15 px
  maxFlexionDeg: number; // <= 8 deg
  hitStopFrames: number; // 1 or 2
}

export const MANDATORY_CONTACT_EVENTS: ContactEventSpec[] = [
  { frame: 67, section: 2, name: 'Spinning Backhand', targetX: 610, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 113, section: 3, name: 'Low Sweep Kick', targetX: 580, targetY: 740, targetName: 'Ankle Height', effectorBoneIndex: 3, effectorName: 'Right Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 184, section: 4, name: 'Spinning Back Kick', targetX: 500, targetY: 520, targetName: 'Chest Height', effectorBoneIndex: 3, effectorName: 'Right Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 228, section: 5, name: 'Whip Backhand', targetX: 680, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 246, section: 5, name: 'High Hook Kick', targetX: 690, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 6, effectorName: 'Left Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 281, section: 6, name: 'Combo Spin Backhand 1', targetX: 730, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 299, section: 6, name: 'Combo Spin Roundhouse', targetX: 740, targetY: 520, targetName: 'Chest Height', effectorBoneIndex: 6, effectorName: 'Left Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 316, section: 6, name: 'Combo Spin Backhand 2', targetX: 750, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 368, section: 7, name: 'Rising Palm Strike', targetX: 720, targetY: 435, targetName: 'Chin Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 384, section: 7, name: 'Flying Side Kick', targetX: 780, targetY: 520, targetName: 'Chest Height', effectorBoneIndex: 3, effectorName: 'Right Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 1 },
  { frame: 418, section: 8, name: 'Perfect Straight Palm', targetX: 810, targetY: 435, targetName: 'Head Height', effectorBoneIndex: 11, effectorName: 'Right Hand', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 2 },
  { frame: 436, section: 8, name: 'Perfect Side Kick', targetX: 830, targetY: 520, targetName: 'Chest Height', effectorBoneIndex: 3, effectorName: 'Right Foot', maxDistancePx: 15, maxFlexionDeg: 8, hitStopFrames: 2 },
];

export interface StumbleEventReport {
  eventId: number;
  startFrame: number;
  peakFrame: number;
  peakComDistancePx: number; // >= 20px outside BoS
  durationFrames: number; // >= 3 frames
  recoveryFrame: number;
  finalComMarginPx: number; // >= 0 (inside BoS after recovery)
}

export interface ContactEventReport {
  frame: number;
  strikeName: string;
  targetName: string;
  effectorName: string;
  targetX: number;
  targetY: number;
  effectorX: number;
  effectorY: number;
  distancePx: number; // <= 15
  jointFlexionDeg: number; // <= 8
  hitStopDuration: number;
  passed: boolean;
}

export interface StrikeSpeedReport {
  strikeName: string;
  contactFrame: number;
  peakEffectorSpeed: number; // px/frame
  precedingStumbleAvgSpeed: number; // px/frame
  ratio: number; // >= 3.0
  passed: boolean;
}

export interface DrunkenAuditReport {
  totalFrames: number;
  stumbleEvents: StumbleEventReport[];
  contactReports: ContactEventReport[];
  strikeSpeedReports: StrikeSpeedReport[];
  maxFootYError: number; // <= 2px
  maxPlantedFootDrift: number; // < 2px
  maxRootOneFrameJump: number; // <= 45px
  maxBoneLengthVariation: number; // <= 1px
  armStaticFrameViolation: boolean; // FAIL if static > 6 frames outside holds
  headStabilizationPassed: boolean;
  stumbleVariationPassed: boolean;
  loopContinuityPassed: boolean; // F479 -> F000
  passedChecks: number;
  totalChecks: number;
  passed: boolean;
  items: {
    id: string;
    label: string;
    metric: string;
    threshold: string;
    passed: boolean;
    detail: string;
  }[];
}

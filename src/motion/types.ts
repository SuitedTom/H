import { PHYSICS_CONFIG } from './config';

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'anticipation'
  | 'settle'
  | 'bounce';

export interface Pose17 {
  rootX: number;
  rootY: number;
  scale: number;
  /**
   * 17 world angles in degrees for each bone in the Stick Nodes stickfigure hierarchy.
   * Bone 0 is Root (Pelvis), 1 is Right Thigh, 2 is Right Shin, 3 is Right Foot, etc.
   */
  angles: number[];
  facingRight: boolean;
}

export interface Joint2D {
  index: number;
  name: string;
  parentIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  worldAngleDeg: number;
  length: number;
}

export type FootContactState = 'FREE' | 'PLANT' | 'TOE_OFF' | 'HEEL_STRIKE';

export interface SparseKeyframe17 {
  frame: number;
  pose: Pose17;
  /**
   * Optional custom easing for all joints or per-joint mapping.
   */
  easing?: EasingType | Partial<Record<number, EasingType>>;
  /**
   * Stance foot contact constraints for this keyframe.
   */
  leftFootContact?: {
    state: FootContactState;
    groundY?: number;
    pinWorldX?: number;
  };
  rightFootContact?: {
    state: FootContactState;
    groundY?: number;
    pinWorldX?: number;
  };
  /**
   * If true, moving-hold breathing/micro-variation is active through this keyframe.
   */
  isMovingHold?: boolean;
  /**
   * Human intent note (e.g. "Takeoff push-off", "Heel strike plant", "Recoil compression")
   */
  intentNote?: string;
}

export interface MotionTrack {
  id: string;
  fps: number;
  totalFrames: number;
  animateOnTwos?: boolean;
  frames: Pose17[];
  /** Optional per-track action-aware quality report, populated by the intent compiler. */
  qualityReport?: import('../../skills/validation/AnimationQualityAnalyzer').AnimationQualityReport;
}

export interface TwoBoneIKSolution {
  upperAngleDeg: number;
  lowerAngleDeg: number;
  interiorAngleDeg: number;
  reachAchieved: boolean;
  hyperextended: boolean;
}

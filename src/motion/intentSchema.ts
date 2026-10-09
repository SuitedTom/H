import { EasingType, FootContactState } from './types';

export interface IntentKeyframe {
  frame: number;
  intent: string;
  root: {
    x: number;
    y: number;
    facing?: 'right' | 'left';
  };
  /**
   * Named preset pose (e.g. 'walk_contact_r', 'jump_apex', 'strike_punch_extend')
   */
  preset?: string;
  /**
   * Explicit 17 joint angles if overriding preset.
   */
  angles?: number[];
  /**
   * Optional procedural adjustments on top of preset.
   */
  adjustments?: {
    torsoLeanDeg?: number;
    headTiltDeg?: number;
    reachTarget?: {
      arm: 'right' | 'left';
      x: number;
      y: number;
    };
    kickTarget?: {
      leg: 'right' | 'left';
      x: number;
      y: number;
    };
  };
  contacts?: {
    rightFoot?: { state: FootContactState; y?: number; x?: number };
    leftFoot?: { state: FootContactState; y?: number; x?: number };
  };
  easing?: EasingType;
  isMovingHold?: boolean;
}

export interface CharacterIntent {
  id: string;
  name: string;
  scale?: number;
  colorHex?: string;
  keyframes: IntentKeyframe[];
}

export interface InteractionEventIntent {
  frame: number;
  type: 'STRIKE_IMPACT' | 'CATCH' | 'LANDING';
  attackerId?: string;
  defenderId?: string;
  attackerAnchor?: string;
  defenderAnchor?: string;
  hitStopFrames?: number;
  recoilDistancePx?: number;
}

export interface AnimationIntentDocument {
  title: string;
  fps: number;
  totalFrames: number;
  groundY?: number;
  animateOnTwos?: boolean;
  characters: CharacterIntent[];
  events?: InteractionEventIntent[];
}

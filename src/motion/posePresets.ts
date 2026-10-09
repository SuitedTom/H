import { Pose17 } from './types';

/**
 * Standard baseline angle sets for canonical human poses.
 * 17 bones:
 * 0: Root (Pelvis)
 * 1: R Thigh, 2: R Shin, 3: R Foot
 * 4: L Thigh, 5: L Shin, 6: L Foot
 * 7: Lower Spine, 8: Upper Chest
 * 9: R Bicep, 10: R Forearm, 11: R Hand
 * 12: Neck, 13: Head
 * 14: L Bicep, 15: L Forearm, 16: L Hand
 */
export const CANONICAL_POSE_PRESETS: Record<string, number[]> = {
  // Neutral upright standing pose facing right
  stand_neutral: [
    0,
    -86, -92, 0,
    -94, -88, 0,
    90, 90,
    -85, -88, -88,
    90, 90,
    -95, -92, -92,
  ],

  // Combat ready guard stance
  combat_guard: [
    0,
    -70, -112, 0,
    -115, -72, 0,
    88, 86,
    -45, 58, 60,
    90, 90,
    -68, 68, 70,
  ],

  // Walk: Right leg forward heel-strike, Left leg back toe-off
  walk_contact_r: [
    0,
    -58, -118, -15,
    -125, -65, 25,
    86, 88,
    -110, -85, -85,
    90, 90,
    -70, -95, -95,
  ],

  // Walk: Right passing (bearing weight), Left leg swinging through
  walk_passing_r: [
    0,
    -88, -92, 0,
    -60, -135, 10,
    90, 90,
    -88, -90, -90,
    90, 90,
    -92, -90, -90,
  ],

  // Walk: Left leg forward heel-strike, Right leg back toe-off
  walk_contact_l: [
    0,
    -125, -65, 25,
    -58, -118, -15,
    86, 88,
    -70, -95, -95,
    90, 90,
    -110, -85, -85,
  ],

  // Walk: Left passing (bearing weight), Right leg swinging through
  walk_passing_l: [
    0,
    -60, -135, 10,
    -88, -92, 0,
    90, 90,
    -92, -90, -90,
    90, 90,
    -88, -90, -90,
  ],

  // Jump: Anticipation crouch before launch
  jump_crouch: [
    0,
    -55, -132, 0,
    -55, -132, 0,
    78, 74,
    -125, -50, -50,
    82, 85,
    -125, -50, -50,
  ],

  // Jump: Ballistic flight apex
  jump_apex: [
    0,
    -68, -125, -30,
    -75, -120, -30,
    88, 88,
    45, 80, 80,
    90, 90,
    45, 80, 80,
  ],

  // Jump: Landing compression impact dip
  jump_landing: [
    0,
    -50, -138, 0,
    -50, -138, 0,
    75, 72,
    -110, -60, -60,
    80, 82,
    -110, -60, -60,
  ],

  // Strike: Straight punch extension
  strike_punch_extend: [
    0,
    -75, -105, 0,
    -120, -65, 20,
    82, 80,
    0, 2, 2,        // Right arm fully extended forward horizontally
    86, 88,
    -75, 70, 70,    // Left arm tucked in guard
  ],

  // Strike: Roundhouse side kick extension
  strike_kick_extend: [
    0,
    14, 16, 16,     // Right leg extended horizontally
    -95, -88, 0,    // Planted support leg
    108, 112,       // Torso counter-lean backward
    -45, 60, 60,
    92, 94,
    -65, 65, 65,
  ],

  // Defender: Block guard
  defend_block: [
    0,
    -82, -98, 0,
    -105, -78, 0,
    92, 95,
    45, 90, 90,     // Forearm shield raised vertically
    90, 90,
    -60, 60, 60,
  ],

  // Defender: Impact recoil flinch
  defend_recoil: [
    0,
    -95, -85, 0,
    -115, -70, 0,
    114, 120,       // Torso whipped backward by impact force
    -35, 75, 75,
    105, 108,
    -50, 80, 80,
  ],

  // Run cycle: right-foot contact, left leg trailing, arms counter-swing.
  // This is a readable key pose, not a complete cycle by itself.
  run_contact_r: [
    0,
    -48, -112, -12,
    -132, -55, 22,
    78, 80,          // Forward whole-body lean; head remains relatively level.
    -28, -112, -105, // Forward arm drives while elbow stays flexed.
    88, 88,
    148, 58, 52,     // Opposing arm swing, also with a bent elbow.
  ],

  // Run cycle: right-leg drive/push-off with strong hip extension.
  run_drive_r: [
    0,
    -78, -82, 8,
    -48, -128, 12,
    76, 79,
    -55, -130, -120,
    88, 88,
    125, 48, 42,
  ],

  // Run cycle: flight/hang pose; lead knee drives forward and rear leg trails.
  run_flight_r: [
    0,
    -48, -118, -18,
    -145, -48, 18,
    80, 82,
    -35, -118, -108,
    90, 90,
    145, 55, 48,
  ],

  // Mirrored run contact key pose for alternating gait phase.
  run_contact_l: [
    0,
    -132, -55, 22,
    -48, -112, -12,
    78, 80,
    148, 58, 52,
    88, 88,
    -28, -112, -105,
  ],

  // Punch: loaded chamber, rear shoulder and torso rotate into the strike.
  strike_punch_chamber: [
    0,
    -78, -105, 0,
    -112, -72, 8,
    78, 73,
    -68, 48, 52,
    88, 90,
    -115, -48, -42,
  ],

  // Punch recovery: fist retracts to guard and weight returns over the support base.
  strike_punch_recover: [
    0,
    -82, -100, 0,
    -108, -78, 5,
    86, 88,
    -55, 55, 58,
    90, 90,
    -82, 68, 70,
  ],

  // Sword: compact ready guard. Right hand is the weapon hand; off-hand protects.
  sword_guard: [
    0,
    -72, -110, 0,
    -112, -76, 4,
    84, 82,
    42, 68, 58,     // Weapon arm raised; wrist/hand follows the forearm.
    90, 90,
    -55, 62, 64,    // Off-hand stays near the torso/guard line.
  ],

  // Sword: overhead/high-line wind-up. Load hips and torso; keep the weapon hand connected.
  sword_windup_high: [
    0,
    -64, -120, 0,
    -118, -72, 5,
    78, 72,
    88, 72, 62,
    92, 90,
    -48, 62, 65,
  ],

  // Sword: descending diagonal slash at the action extreme.
  sword_slash_contact: [
    0,
    -58, -122, -8,
    -118, -70, 10,
    100, 104,       // Torso rotation contributes to the cut instead of arm-only motion.
    -28, -52, -42,
    86, 88,
    -62, 58, 62,
  ],

  // Sword: follow-through after the blade passes the target line.
  sword_followthrough: [
    0,
    -52, -115, -5,
    -122, -68, 8,
    108, 112,
    -62, -88, -78,
    88, 90,
    -70, 55, 58,
  ],

  // Sword: controlled recovery back toward guard, ready for the next action.
  sword_recover: [
    0,
    -74, -108, 0,
    -110, -78, 2,
    88, 88,
    24, 62, 58,
    90, 90,
    -52, 62, 65,
  ],

  run_drive_l: [0, -48, -128, 12, -78, -82, 8, 76, 79, 125, 48, 42, 88, 88, -55, -130, -120],
  run_flight_l: [0, -145, -48, 18, -48, -118, -18, 80, 82, 145, 55, 48, 90, 90, -35, -118, -108],
  block_high: [0, -82, -98, 0, -105, -78, 0, 94, 92, 58, 100, 94, 88, 88, 40, 96, 90],
  block_low: [0, -65, -132, 0, -118, -70, 8, 84, 86, -25, 62, 58, 88, 88, -145, 65, 60],
  fall_backward: [0, -115, -82, -8, -130, -70, 12, 120, 126, -135, -70, -58, 108, 112, 35, 70, 60],
  land_crouch: [0, -58, -136, 0, -60, -132, 0, 74, 76, -118, -55, -50, 86, 86, -120, -58, -52],
};

export function getPosePreset(name: string): number[] {
  const preset = CANONICAL_POSE_PRESETS[name];
  if (!preset) {
    return [...CANONICAL_POSE_PRESETS.stand_neutral];
  }
  return [...preset];
}

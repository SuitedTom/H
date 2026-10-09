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
};

export function getPosePreset(name: string): number[] {
  const preset = CANONICAL_POSE_PRESETS[name];
  if (!preset) {
    return [...CANONICAL_POSE_PRESETS.stand_neutral];
  }
  return [...preset];
}

import {
  AnimationIntentDocument,
  CharacterIntent,
  IntentKeyframe,
} from './intentSchema';
import { SparseKeyframe17, Pose17, MotionTrack } from './types';
import { getPosePreset } from './posePresets';
import { solveArmIK, solveTwoBoneIK } from './ikSolvers';
import { expandKeyframesToMotion } from './animator';
import { PHYSICS_CONFIG } from './config';

/**
 * Parses and compiles an AnimationIntentDocument into full-frame MotionTracks.
 */
export function compileIntentToMotion(
  doc: AnimationIntentDocument
): MotionTrack[] {
  const groundY = doc.groundY ?? PHYSICS_CONFIG.environment.defaultGroundY;
  const fps = doc.fps ?? PHYSICS_CONFIG.timing.standardFps;
  const totalFrames = doc.totalFrames;
  const animateOnTwos = doc.animateOnTwos ?? false;

  const tracks: MotionTrack[] = [];

  for (const char of doc.characters) {
    const scale = char.scale ?? PHYSICS_CONFIG.skeleton.defaultScale;
    const sparseKeyframes: SparseKeyframe17[] = [];

    for (const kf of char.keyframes) {
      const facingRight = kf.root.facing !== 'left';
      let angles: number[];

      if (kf.angles && kf.angles.length === 17) {
        angles = [...kf.angles];
      } else if (kf.preset) {
        angles = getPosePreset(kf.preset);
      } else {
        angles = getPosePreset('stand_neutral');
      }

      // If facing left, mirror angles appropriately
      if (!facingRight) {
        // Invert horizontal orientation for facing left
        angles = angles.map((a, idx) => {
          // Angle mirror across vertical axis (180 - a)
          if (idx === 0) return a;
          let mirrored = 180 - a;
          if (mirrored > 180) mirrored -= 360;
          if (mirrored < -180) mirrored += 360;
          return mirrored;
        });
      }

      const pose: Pose17 = {
        rootX: kf.root.x,
        rootY: kf.root.y,
        scale,
        angles,
        facingRight,
      };

      // Procedural adjustments
      if (kf.adjustments) {
        if (kf.adjustments.torsoLeanDeg !== undefined) {
          pose.angles[7] += kf.adjustments.torsoLeanDeg;
          pose.angles[8] += kf.adjustments.torsoLeanDeg * 0.8;
        }
        if (kf.adjustments.headTiltDeg !== undefined) {
          pose.angles[12] += kf.adjustments.headTiltDeg * 0.5;
          pose.angles[13] += kf.adjustments.headTiltDeg;
        }
        if (kf.adjustments.reachTarget) {
          solveArmIK(
            pose,
            kf.adjustments.reachTarget.arm,
            kf.adjustments.reachTarget.x,
            kf.adjustments.reachTarget.y
          );
        }
      }

      sparseKeyframes.push({
        frame: kf.frame,
        pose,
        easing: kf.easing ?? 'easeInOutQuad',
        leftFootContact: kf.contacts?.leftFoot
          ? {
              state: kf.contacts.leftFoot.state,
              groundY: kf.contacts.leftFoot.y ?? groundY,
              pinWorldX: kf.contacts.leftFoot.x,
            }
          : undefined,
        rightFootContact: kf.contacts?.rightFoot
          ? {
              state: kf.contacts.rightFoot.state,
              groundY: kf.contacts.rightFoot.y ?? groundY,
              pinWorldX: kf.contacts.rightFoot.x,
            }
          : undefined,
        isMovingHold: kf.isMovingHold,
        intentNote: kf.intent,
      });
    }

    const rawFrames = expandKeyframesToMotion(sparseKeyframes, {
      totalFrames,
      defaultGroundY: groundY,
      animateOnTwos,
    });

    tracks.push({
      id: char.id,
      fps,
      totalFrames,
      animateOnTwos,
      frames: rawFrames,
    });
  }

  // Multi-character interaction event synchronization
  if (doc.events && doc.events.length > 0) {
    for (const ev of doc.events) {
      if (ev.type === 'STRIKE_IMPACT' && ev.defenderId) {
        const defTrack = tracks.find((t) => t.id === ev.defenderId);
        const attTrack = tracks.find((t) => t.id === ev.attackerId);
        const hitStops = ev.hitStopFrames ?? 2;
        const recoilPx = ev.recoilDistancePx ?? 6.0;

        if (defTrack && ev.frame < defTrack.frames.length) {
          // Freeze pose during hit-stop frames on both characters
          const clashPoseDef = { ...defTrack.frames[ev.frame] };
          for (let s = 1; s <= hitStops && ev.frame + s < defTrack.frames.length; s++) {
            defTrack.frames[ev.frame + s] = {
              ...clashPoseDef,
              angles: [...clashPoseDef.angles],
            };
          }
          if (attTrack && ev.frame < attTrack.frames.length) {
            const clashPoseAtt = { ...attTrack.frames[ev.frame] };
            for (let s = 1; s <= hitStops && ev.frame + s < attTrack.frames.length; s++) {
              attTrack.frames[ev.frame + s] = {
                ...clashPoseAtt,
                angles: [...clashPoseAtt.angles],
              };
            }
          }
          // Apply directional recoil slide to defender
          const direction =
            attTrack && attTrack.frames[ev.frame].rootX < defTrack.frames[ev.frame].rootX ? 1 : -1;
          for (let f = ev.frame + hitStops; f < defTrack.frames.length; f++) {
            defTrack.frames[f].rootX += recoilPx * direction;
          }
        }
      }
    }
  }

  return tracks;
}

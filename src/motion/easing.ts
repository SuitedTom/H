import { EasingType } from './types';

export function evaluateEasing(type: EasingType, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'linear':
      return clamped;

    case 'easeInQuad':
      return clamped * clamped;

    case 'easeOutQuad':
      return clamped * (2 - clamped);

    case 'easeInOutQuad':
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;

    case 'easeInCubic':
      return clamped * clamped * clamped;

    case 'easeOutCubic': {
      const f = clamped - 1;
      return f * f * f + 1;
    }

    case 'easeInOutCubic':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : (clamped - 1) * (2 * clamped - 2) * (2 * clamped - 2) + 1;

    case 'anticipation': {
      // Wind-up / pull-back before explosive forward motion:
      // dips back slightly (e.g. -15% at t=0.25) then accelerates forward
      const s = 1.70158;
      return clamped * clamped * ((s + 1) * clamped - s);
    }

    case 'settle': {
      // Overshoot and settle back to rest
      const s = 1.70158;
      const f = clamped - 1;
      return f * f * ((s + 1) * f + s) + 1;
    }

    case 'bounce': {
      let n = clamped;
      if (n < 1 / 2.75) {
        return 7.5625 * n * n;
      } else if (n < 2 / 2.75) {
        n -= 1.5 / 2.75;
        return 7.5625 * n * n + 0.75;
      } else if (n < 2.5 / 2.75) {
        n -= 2.25 / 2.75;
        return 7.5625 * n * n + 0.9375;
      } else {
        n -= 2.625 / 2.75;
        return 7.5625 * n * n + 0.984375;
      }
    }

    default:
      return clamped;
  }
}

/**
 * Interpolates two angles in degrees along the shortest arc,
 * preventing unnatural 360-degree flip discontinuities.
 */
export function interpolateAngleDeg(a1: number, a2: number, t: number): number {
  let diff = (a2 - a1) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a1 + diff * t;
}

/**
 * Cubic Hermite interpolation with tangent continuity across keyframe boundaries.
 */
export function hermiteInterpolate(
  p0: number,
  p1: number,
  m0: number,
  m1: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

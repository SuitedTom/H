import { FruitNinjaGeneratorConfig, FruitNinjaKeyframeSpec } from './fruitNinjaTypes';
import { generateCanonicalFruitNinjaKeyframes } from './fruitNinjaData';

/**
 * Procedural animation generator for Fruit Ninja Katana Slicing
 */
export function buildCanonicalFruitNinjaFrames(config: FruitNinjaGeneratorConfig): FruitNinjaKeyframeSpec[] {
  const rawFrames = generateCanonicalFruitNinjaKeyframes();

  if (config.targetFps === 12) {
    // Subsample 115 frames down to 58 frames at 12 FPS
    return rawFrames.filter((_, idx) => idx % 2 === 0);
  }

  return rawFrames;
}

export function buildAdjustedFruitNinjaFrames(config: FruitNinjaGeneratorConfig): FruitNinjaKeyframeSpec[] {
  return buildCanonicalFruitNinjaFrames(config);
}

export interface JuiceParticleSpec {
  x: number;
  y: number;
  radius: number;
  colorHex: string;
  alpha: number;
}

export interface FruitEntitySpec {
  id: string;
  type: 'orange' | 'watermelon' | 'apple' | 'bomb';
  x: number;
  y: number;
  radius: number;
  rotationDeg: number;
  isSplit: boolean;
  splitFrame?: number;
  half1: { x: number; y: number; rotationDeg: number };
  half2: { x: number; y: number; rotationDeg: number };
  juiceParticles: JuiceParticleSpec[];
}

export interface FruitNinjaKeyframeSpec {
  frame: number; // 0..114
  act: string;
  technique: string;
  phase: string;

  // Ninja Root & Pose (17-bone kinetic hierarchy)
  manX: number;
  manY: number;
  bodyRotationDeg: number;
  manAngles: number[]; // 17 world angles in degrees

  // Katana Sword Telemetry
  katanaX: number;
  katanaY: number;
  katanaAngleDeg: number;
  katanaLength: number;
  isSlashActive: boolean;
  slashArcTrail?: {
    centerX: number;
    centerY: number;
    radius: number;
    startAngleRad: number;
    endAngleRad: number;
  } | null;

  // Active Flying Fruits & Slice Effects
  fruits: FruitEntitySpec[];
  isHitFrame: boolean;
  hitType: 'none' | 'orange-slice' | 'watermelon-split' | 'bomb-defuse';
  hitIntensity: number; // 0.0 .. 1.0

  // Center of Mass & Dynamic Equilibrium
  comX: number;
  comY: number;
  supportMinX: number;
  supportMaxX: number;
  isGrounded: boolean;
  isBalanced: boolean;
  stabilityMargin: number;

  // Biomechanical & Kinetic Telemetry
  bladeSpeedPxPerFrame: number;
  torsoRotationDeg: number;
  angularVelocityDegPerFrame: number;

  // Camera & Title Overlay
  camX: number;
  camY: number;
  camZoom: number;
  titleOverlay: string | null;
}

export interface FruitNinjaGeneratorConfig {
  projectName: string;
  targetFps: 12 | 24;
  ninjaColorHex: string; // Default #0F172A
  bladeColorHex: string; // Default #E2E8F0
  groundY: number; // Default 755.0
  enableSlashTrails: boolean;
  enableJuiceParticles: boolean;
  fruitScale: number;
}

export interface FruitNinjaAuditReport {
  overallVerdict: 'PASS' | 'WARNING' | 'FAIL';
  overallScore: number;
  domains: {
    name: string;
    verdict: 'PASS' | 'WARNING' | 'FAIL';
    measuredValue: number;
    threshold: number;
    notes: string;
  }[];
  failureDiagnostics: string[];
}

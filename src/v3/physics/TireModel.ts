import type { MagicFormulaCoefficients, SurfaceType, TireCompoundSpec } from '../types';

export interface TireForceInput {
  slipRatio: number;
  slipAngle: number;
  normalLoadN: number;
  tempC: number;
  wear: number;
  surface: SurfaceType;
  wetness: number;
  compound: TireCompoundSpec;
}

export interface TireForceOutput {
  fxN: number;
  fyN: number;
  gripScale: number;
}

const SURFACE_GRIP: Record<SurfaceType, number> = {
  ASPHALT: 1,
  KERB: 0.88,
  RUNOFF: 0.72,
  GRASS: 0.38,
  GRAVEL: 0.31,
  WET: 0.63,
};

function magicFormula(slip: number, peakForceN: number, c: MagicFormulaCoefficients): number {
  const bs = c.B * slip;
  return peakForceN * Math.sin(c.C * Math.atan(bs - c.E * (bs - Math.atan(bs))));
}

export function temperatureGrip(tempC: number, compound: TireCompoundSpec): number {
  const [low, high] = compound.operatingWindowC;
  if (tempC >= low && tempC <= high) return 1;

  const distance = tempC < low ? low - tempC : tempC - high;
  return Math.max(0.62, 1 - distance / 90);
}

export function wearGrip(wear: number): number {
  const clamped = Math.min(1, Math.max(0, wear));
  // Wear is 0=new, 1=fully worn.
  return 1 - 0.30 * Math.pow(clamped, 1.45);
}

export function loadSensitiveMu(baseMu: number, normalLoadN: number, nominalLoadN = 2000): number {
  const ratio = (normalLoadN - nominalLoadN) / Math.max(1, nominalLoadN);
  return Math.max(baseMu * 0.72, baseMu * (1 - 0.09 * ratio));
}

export function computeTireForces(input: TireForceInput): TireForceOutput {
  if (input.normalLoadN <= 0) return { fxN: 0, fyN: 0, gripScale: 0 };

  const wetness = Math.min(1, Math.max(0, input.wetness));
  const dryMu = input.compound.peakMuDry;
  const wetMu = input.compound.peakMuWet;
  const baseMu = dryMu + (wetMu - dryMu) * wetness;

  const gripScale =
    SURFACE_GRIP[input.surface] *
    temperatureGrip(input.tempC, input.compound) *
    wearGrip(input.wear);

  const mu = loadSensitiveMu(baseMu, input.normalLoadN) * gripScale;
  const peak = Math.max(0, mu * input.normalLoadN);

  const fx0 = magicFormula(input.slipRatio, peak, input.compound.longitudinal);
  // Positive slip angle produces a force opposing lateral motion.
  const fy0 = -magicFormula(input.slipAngle, peak, input.compound.lateral);

  // Combined-slip friction ellipse.
  const nx = fx0 / Math.max(1, peak);
  const ny = fy0 / Math.max(1, peak);
  const q = Math.sqrt(nx * nx + ny * ny);
  const scale = q > 1 ? 1 / q : 1;

  return {
    fxN: fx0 * scale,
    fyN: fy0 * scale,
    gripScale,
  };
}

export const DEFAULT_COMPOUNDS: Record<'SOFT' | 'MEDIUM' | 'HARD', TireCompoundSpec> = {
  SOFT: {
    id: 'SOFT',
    peakMuDry: 1.82,
    peakMuWet: 0.72,
    optimumTempC: 100,
    operatingWindowC: [88, 112],
    longitudinal: { B: 10.4, C: 1.72, E: 0.18 },
    lateral: { B: 8.8, C: 1.56, E: 0.22 },
    wearCoefficient: 1.2,
    heatCapacity: 1,
    coolingCoefficient: 1,
  },
  MEDIUM: {
    id: 'MEDIUM',
    peakMuDry: 1.70,
    peakMuWet: 0.74,
    optimumTempC: 98,
    operatingWindowC: [84, 114],
    longitudinal: { B: 10.0, C: 1.68, E: 0.20 },
    lateral: { B: 8.5, C: 1.54, E: 0.24 },
    wearCoefficient: 0.86,
    heatCapacity: 1.08,
    coolingCoefficient: 1,
  },
  HARD: {
    id: 'HARD',
    peakMuDry: 1.60,
    peakMuWet: 0.76,
    optimumTempC: 96,
    operatingWindowC: [80, 118],
    longitudinal: { B: 9.7, C: 1.65, E: 0.22 },
    lateral: { B: 8.2, C: 1.51, E: 0.26 },
    wearCoefficient: 0.63,
    heatCapacity: 1.16,
    coolingCoefficient: 1.04,
  },
};

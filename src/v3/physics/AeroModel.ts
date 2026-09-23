export interface AeroSpec {
  cdA: number;
  clAFront: number;
  clARear: number;
  drsDragReduction: number;
  drsRearDownforceReduction: number;
}

export interface AeroInput {
  speedMps: number;
  airDensity: number;
  drsOpen: boolean;
  wakeStrength: number;
}

export interface AeroOutput {
  dragN: number;
  frontDownforceN: number;
  rearDownforceN: number;
}

export function computeAero(spec: AeroSpec, input: AeroInput): AeroOutput {
  const v2 = input.speedMps * input.speedMps;
  const q = 0.5 * input.airDensity * v2;
  const wake = Math.max(0, Math.min(1, input.wakeStrength));

  const dragWakeScale = 1 - wake * 0.24;
  const downforceWakeScale = 1 - wake * 0.34;
  const drsDragScale = input.drsOpen ? 1 - spec.drsDragReduction : 1;
  const rearDforceScale = input.drsOpen ? 1 - spec.drsRearDownforceReduction : 1;

  return {
    dragN: q * spec.cdA * dragWakeScale * drsDragScale,
    frontDownforceN: q * spec.clAFront * downforceWakeScale,
    rearDownforceN: q * spec.clARear * downforceWakeScale * rearDforceScale,
  };
}

export const DEFAULT_AERO: AeroSpec = {
  cdA: 1.18,
  clAFront: 2.05,
  clARear: 2.42,
  drsDragReduction: 0.19,
  drsRearDownforceReduction: 0.24,
};

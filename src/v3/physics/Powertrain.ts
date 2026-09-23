export interface TorquePoint {
  rpm: number;
  torqueNm: number;
}

export interface PowertrainSpec {
  torqueCurve: TorquePoint[];
  idleRpm: number;
  redlineRpm: number;
  gearRatios: number[];
  finalDrive: number;
  drivetrainEfficiency: number;
  engineBrakeTorqueNm: number;
  wheelRadiusM: number;
}

export interface PowertrainState {
  gear: number;
  rpm: number;
}

export function interpolateTorque(curve: TorquePoint[], rpm: number): number {
  if (curve.length === 0) return 0;
  if (rpm <= curve[0].rpm) return curve[0].torqueNm;

  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (rpm <= b.rpm) {
      const t = (rpm - a.rpm) / Math.max(1, b.rpm - a.rpm);
      return a.torqueNm + (b.torqueNm - a.torqueNm) * t;
    }
  }
  return curve[curve.length - 1].torqueNm;
}

export function wheelRpmToEngineRpm(
  wheelAngularVelocity: number,
  gear: number,
  spec: PowertrainSpec,
): number {
  if (gear <= 0) return spec.idleRpm;
  const ratio = spec.gearRatios[gear - 1] * spec.finalDrive;
  return Math.max(spec.idleRpm, Math.abs(wheelAngularVelocity) * ratio * 60 / (Math.PI * 2));
}

export function computeDrivenAxleTorque(
  throttle: number,
  state: PowertrainState,
  spec: PowertrainSpec,
): number {
  if (state.gear <= 0) return 0;
  const engineTorque = interpolateTorque(spec.torqueCurve, state.rpm);
  const throttleTorque = engineTorque * Math.pow(Math.max(0, Math.min(1, throttle)), 1.12);
  const engineBrake = (1 - Math.max(0, throttle)) * spec.engineBrakeTorqueNm;
  const ratio = spec.gearRatios[state.gear - 1] * spec.finalDrive;
  return (throttleTorque - engineBrake) * ratio * spec.drivetrainEfficiency;
}

export function splitLsdTorque(
  axleTorqueNm: number,
  leftOmega: number,
  rightOmega: number,
  lockingStrength: number,
  maxBiasNm: number,
): [number, number] {
  const bias = Math.max(-maxBiasNm, Math.min(maxBiasNm, (rightOmega - leftOmega) * lockingStrength));
  return [axleTorqueNm * 0.5 + bias, axleTorqueNm * 0.5 - bias];
}

export const DEFAULT_POWERTRAIN: PowertrainSpec = {
  idleRpm: 4500,
  redlineRpm: 15000,
  torqueCurve: [
    { rpm: 4500, torqueNm: 265 },
    { rpm: 7000, torqueNm: 390 },
    { rpm: 9500, torqueNm: 470 },
    { rpm: 11500, torqueNm: 505 },
    { rpm: 13500, torqueNm: 475 },
    { rpm: 15000, torqueNm: 420 },
  ],
  gearRatios: [3.10, 2.48, 2.03, 1.70, 1.46, 1.28, 1.14, 1.03],
  finalDrive: 3.35,
  drivetrainEfficiency: 0.92,
  engineBrakeTorqueNm: 110,
  wheelRadiusM: 0.36,
};

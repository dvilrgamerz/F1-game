export interface SuspensionSpec {
  restLengthM: number;
  maxCompressionM: number;
  springRateNPerM: number;
  damperRateNsPerM: number;
  bumpStopRateNPerM: number;
}

export interface SuspensionState {
  compressionM: number;
  compressionVelocityMps: number;
}

export function stepSuspension(
  currentLengthM: number,
  previous: SuspensionState,
  spec: SuspensionSpec,
  dt: number,
) {
  const compression = Math.max(
    0,
    Math.min(spec.maxCompressionM, spec.restLengthM - currentLengthM),
  );

  const compressionVelocity =
    (compression - previous.compressionM) / Math.max(1e-4, dt);

  const spring = compression * spec.springRateNPerM;
  const damper = compressionVelocity * spec.damperRateNsPerM;

  const bumpStart = spec.maxCompressionM * 0.82;
  const bumpCompression = Math.max(0, compression - bumpStart);
  const bumpStop = bumpCompression * spec.bumpStopRateNPerM;

  return {
    state: {
      compressionM: compression,
      compressionVelocityMps: compressionVelocity,
    },
    forceN: Math.max(0, spring + damper + bumpStop),
  };
}

export function antiRollForce(
  leftCompressionM: number,
  rightCompressionM: number,
  antiRollRateNPerM: number,
) {
  return (leftCompressionM - rightCompressionM) * antiRollRateNPerM;
}

export const DEFAULT_SUSPENSION: SuspensionSpec = {
  restLengthM: 0.29,
  maxCompressionM: 0.17,
  springRateNPerM: 185_000,
  damperRateNsPerM: 15_500,
  bumpStopRateNPerM: 420_000,
};

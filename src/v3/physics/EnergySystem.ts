export type ErsMode = 'HARVEST' | 'BALANCED' | 'ATTACK' | 'OVERTAKE';

export interface EnergyState {
  joules: number;
  capacityJ: number;
}

export interface EnergyStepInput {
  mode: ErsMode;
  throttle: number;
  brake: number;
  speedMps: number;
  dt: number;
}

const MODE_POWER_W: Record<ErsMode, number> = {
  HARVEST: 0,
  BALANCED: 55_000,
  ATTACK: 95_000,
  OVERTAKE: 130_000,
};

export function stepEnergy(state: EnergyState, input: EnergyStepInput) {
  const deployPower = MODE_POWER_W[input.mode] * Math.max(0, Math.min(1, input.throttle));
  const harvestPower = Math.max(0, input.brake) * Math.min(95_000, 30_000 + input.speedMps * 850);

  state.joules = Math.max(
    0,
    Math.min(state.capacityJ, state.joules + (harvestPower - deployPower) * input.dt),
  );

  return {
    deployPowerW: state.joules > 0 ? deployPower : 0,
    harvestPowerW: harvestPower,
  };
}

import type { VehicleInput } from '../types';

export interface AiDriverState {
  speedMps: number;
  headingErrorRad: number;
  lateralErrorM: number;
  distanceToCarAheadM: number;
  relativeSpeedMps: number;
  targetSpeedMps: number;
  drsAvailable: boolean;
}

export interface AiSkill {
  paceUtilization: number;
  reaction: number;
  aggression: number;
}

export class AiDriver {
  constructor(private readonly skill: AiSkill) {}

  computeInput(state: AiDriverState): VehicleInput {
    const desiredSpeed = state.targetSpeedMps * this.skill.paceUtilization;
    const speedError = desiredSpeed - state.speedMps;

    let throttle = Math.max(0, Math.min(1, speedError / 12));
    let brake = Math.max(0, Math.min(1, -speedError / 10));

    const trafficClosing =
      state.distanceToCarAheadM < 35 &&
      state.relativeSpeedMps > 1.5;

    if (trafficClosing) {
      const danger = Math.max(0, Math.min(1, (35 - state.distanceToCarAheadM) / 25));
      throttle *= 1 - danger * 0.75;
      brake = Math.max(brake, danger * (0.35 + this.skill.reaction * 0.45));
    }

    const steer =
      Math.max(-1, Math.min(1,
        state.headingErrorRad * 2.6 +
        state.lateralErrorM * 0.12,
      ));

    return {
      throttle,
      brake,
      steer,
      ersDeploy: throttle > 0.88 && this.skill.aggression > 0.55,
      drsOpen: state.drsAvailable && throttle > 0.7 && brake < 0.05,
    };
  }
}

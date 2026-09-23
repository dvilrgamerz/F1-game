import type { TireCompoundId } from '../types';

export type PitPhase =
  | 'NONE'
  | 'REQUESTED'
  | 'ENTRY'
  | 'LANE'
  | 'BOX_APPROACH'
  | 'STOPPED'
  | 'SERVICE'
  | 'RELEASE'
  | 'EXIT';

export interface PitStopRequest {
  compound: TireCompoundId;
  repairFrontWing: boolean;
}

export interface PitStopState {
  phase: PitPhase;
  requested: boolean;
  compound: TireCompoundId;
  repairFrontWing: boolean;
  serviceElapsedS: number;
  requiredServiceS: number;
  pitSpeeding: boolean;
}

export interface PitStepInput {
  dt: number;
  progress: number;
  speedMps: number;
  inPitLane: boolean;
  inPitBox: boolean;
  laneClear: boolean;
  pitEntryProgress: number;
  pitExitProgress: number;
  pitSpeedLimitMps: number;
}

const wrapDistance = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
};

export class PitStopSystem {
  readonly state: PitStopState = {
    phase: 'NONE',
    requested: false,
    compound: 'MEDIUM',
    repairFrontWing: false,
    serviceElapsedS: 0,
    requiredServiceS: 0,
    pitSpeeding: false,
  };

  request(request: PitStopRequest) {
    this.state.requested = true;
    this.state.compound = request.compound;
    this.state.repairFrontWing = request.repairFrontWing;
    this.state.phase = 'REQUESTED';
  }

  cancel() {
    if (this.state.phase === 'REQUESTED') {
      this.reset();
    }
  }

  step(input: PitStepInput) {
    this.state.pitSpeeding =
      input.inPitLane && input.speedMps > input.pitSpeedLimitMps + 0.5;

    if (
      this.state.phase === 'REQUESTED' &&
      wrapDistance(input.progress, input.pitEntryProgress) < 0.012
    ) {
      this.state.phase = 'ENTRY';
    }

    if ((this.state.phase === 'ENTRY' || this.state.phase === 'LANE') && input.inPitLane) {
      this.state.phase = input.inPitBox ? 'STOPPED' : 'LANE';
    }

    if (this.state.phase === 'STOPPED' && input.speedMps < 0.35) {
      this.state.serviceElapsedS = 0;
      const tyreService = 2.15 + Math.random() * 0.55;
      const repair = this.state.repairFrontWing ? 7.5 : 0;
      this.state.requiredServiceS = tyreService + repair;
      this.state.phase = 'SERVICE';
    }

    if (this.state.phase === 'SERVICE') {
      this.state.serviceElapsedS += input.dt;
      if (this.state.serviceElapsedS >= this.state.requiredServiceS) {
        this.state.phase = 'RELEASE';
      }
    }

    if (this.state.phase === 'RELEASE' && input.laneClear) {
      this.state.phase = 'EXIT';
    }

    if (
      this.state.phase === 'EXIT' &&
      wrapDistance(input.progress, input.pitExitProgress) < 0.012 &&
      !input.inPitLane
    ) {
      this.reset();
    }
  }

  private reset() {
    this.state.phase = 'NONE';
    this.state.requested = false;
    this.state.repairFrontWing = false;
    this.state.serviceElapsedS = 0;
    this.state.requiredServiceS = 0;
    this.state.pitSpeeding = false;
  }
}

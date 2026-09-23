import type { ClassificationEntry, DriverProgress, RacePhase } from '../types';

export interface RaceDirectorConfig {
  raceLaps: number;
  lightsDurationS: number;
  finishWindowS: number;
}

export class RaceDirector {
  phase: RacePhase = 'GRID';
  private startTimeS = 0;
  private leaderFinishTimeS: number | null = null;

  constructor(private readonly config: RaceDirectorConfig) {}

  begin(nowS: number) {
    this.phase = 'LIGHTS';
    this.startTimeS = nowS;
    this.leaderFinishTimeS = null;
  }

  tick(nowS: number, drivers: DriverProgress[]) {
    if (this.phase === 'LIGHTS' && nowS - this.startTimeS >= this.config.lightsDurationS) {
      this.phase = 'RACING';
    }

    if (this.phase === 'RACING') {
      const winner = drivers.find(d => d.finished || d.lap > this.config.raceLaps);
      if (winner) {
        this.phase = 'FINISHING';
        this.leaderFinishTimeS = nowS;
      }
    }

    if (
      this.phase === 'FINISHING' &&
      this.leaderFinishTimeS !== null &&
      (drivers.every(d => d.finished) || nowS - this.leaderFinishTimeS >= this.config.finishWindowS)
    ) {
      this.phase = 'RESULTS';
    }
  }

  classification(drivers: DriverProgress[]): ClassificationEntry[] {
    const ranked = [...drivers].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.progress !== b.progress) return b.progress - a.progress;
      return a.raceTimeS - b.raceTimeS;
    });

    const leaderTime = ranked[0]?.raceTimeS ?? 0;
    return ranked.map((d, index) => ({
      ...d,
      position: index + 1,
      classifiedTimeS: d.raceTimeS + d.penaltySeconds - leaderTime,
    }));
  }
}

export const DEFAULT_RACE_DIRECTOR = {
  raceLaps: 10,
  lightsDurationS: 5,
  finishWindowS: 45,
} satisfies RaceDirectorConfig;

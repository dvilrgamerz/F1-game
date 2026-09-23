export type SurfaceType = 'ASPHALT' | 'KERB' | 'RUNOFF' | 'GRASS' | 'GRAVEL' | 'WET';
export type WheelId = 'FL' | 'FR' | 'RL' | 'RR';
export type TireCompoundId = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MagicFormulaCoefficients {
  B: number;
  C: number;
  E: number;
}

export interface TireCompoundSpec {
  id: TireCompoundId;
  peakMuDry: number;
  peakMuWet: number;
  optimumTempC: number;
  operatingWindowC: [number, number];
  longitudinal: MagicFormulaCoefficients;
  lateral: MagicFormulaCoefficients;
  wearCoefficient: number;
  heatCapacity: number;
  coolingCoefficient: number;
}

export interface WheelState {
  id: WheelId;
  angularVelocity: number;
  steerAngle: number;
  compression: number;
  compressionVelocity: number;
  normalLoad: number;
  slipRatio: number;
  slipAngle: number;
  longitudinalForce: number;
  lateralForce: number;
  surfaceTempC: number;
  carcassTempC: number;
  wear: number;
  contact: boolean;
  surface: SurfaceType;
}

export interface VehicleInput {
  throttle: number;
  brake: number;
  steer: number;
  ersDeploy: boolean;
  drsOpen: boolean;
  gearUp?: boolean;
  gearDown?: boolean;
}

export interface VehicleTelemetry {
  speedMps: number;
  engineRpm: number;
  gear: number;
  fuelKg: number;
  ersJoules: number;
  frontAeroLoadN: number;
  rearAeroLoadN: number;
  dragN: number;
  wheels: Record<WheelId, WheelState>;
}

export type RacePhase =
  | 'GRID'
  | 'LIGHTS'
  | 'RACING'
  | 'FINISHING'
  | 'RESULTS';

export interface DriverProgress {
  driverId: string;
  lap: number;
  progress: number;
  raceTimeS: number;
  bestLapS: number;
  finished: boolean;
  penaltySeconds: number;
}

export interface ClassificationEntry extends DriverProgress {
  position: number;
  classifiedTimeS: number;
}

export interface DrsZone {
  detectionProgress: number;
  activationStart: number;
  activationEnd: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  lengthMeters: number;
  laps: number;
  widthMeters: number;
  controlPoints: TrackPoint[];
  sectorLines: number[];
  drsZones: DrsZone[];
  pitEntry: number;
  pitExit: number;
  pitSpeedLimitMps: number;
}

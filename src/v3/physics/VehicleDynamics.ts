import type {
  SurfaceType,
  TireCompoundSpec,
  VehicleInput,
  WheelId,
} from '../types';
import { computeTireForces } from './TireModel';
import { computeAero, type AeroSpec } from './AeroModel';
import {
  computeDrivenAxleTorque,
  splitLsdTorque,
  type PowertrainSpec,
  type PowertrainState,
} from './Powertrain';
import { stepEnergy, type EnergyState, type ErsMode } from './EnergySystem';

export interface WheelContactInput {
  id: WheelId;
  localForwardSpeedMps: number;
  localLateralSpeedMps: number;
  wheelAngularVelocityRadS: number;
  wheelRadiusM: number;
  normalLoadN: number;
  temperatureC: number;
  wear: number;
  surface: SurfaceType;
  wetness: number;
}

export interface VehicleDynamicsInput {
  controls: VehicleInput;
  speedMps: number;
  airDensity: number;
  wakeStrength: number;
  wheelContacts: WheelContactInput[];
  compound: TireCompoundSpec;
  aero: AeroSpec;
  powertrain: PowertrainSpec;
  powertrainState: PowertrainState;
  energy: EnergyState;
  ersMode: ErsMode;
  lsdLockingStrength: number;
  lsdMaxBiasNm: number;
  dt: number;
}

export interface WheelForceResult {
  id: WheelId;
  slipRatio: number;
  slipAngle: number;
  fxN: number;
  fyN: number;
}

function computeSlipRatio(
  wheelOmega: number,
  wheelRadiusM: number,
  longitudinalSpeedMps: number,
) {
  const wheelSurfaceSpeed = wheelOmega * wheelRadiusM;
  const denominator = Math.max(1.5, Math.abs(longitudinalSpeedMps));
  return (wheelSurfaceSpeed - longitudinalSpeedMps) / denominator;
}

function computeSlipAngle(longitudinalSpeedMps: number, lateralSpeedMps: number) {
  return Math.atan2(
    lateralSpeedMps,
    Math.max(1.5, Math.abs(longitudinalSpeedMps)),
  );
}

export function computeVehicleDynamics(input: VehicleDynamicsInput) {
  const aero = computeAero(input.aero, {
    speedMps: input.speedMps,
    airDensity: input.airDensity,
    drsOpen: input.controls.drsOpen,
    wakeStrength: input.wakeStrength,
  });

  const ers = stepEnergy(input.energy, {
    mode: input.ersMode,
    throttle: input.controls.throttle,
    brake: input.controls.brake,
    speedMps: input.speedMps,
    dt: input.dt,
  });

  const axleTorque = computeDrivenAxleTorque(
    input.controls.throttle,
    input.powertrainState,
    input.powertrain,
  );

  const rearLeft = input.wheelContacts.find(w => w.id === 'RL');
  const rearRight = input.wheelContacts.find(w => w.id === 'RR');

  const [rearLeftTorqueNm, rearRightTorqueNm] =
    rearLeft && rearRight
      ? splitLsdTorque(
          axleTorque,
          rearLeft.wheelAngularVelocityRadS,
          rearRight.wheelAngularVelocityRadS,
          input.lsdLockingStrength,
          input.lsdMaxBiasNm,
        )
      : [0, 0];

  const wheelForces: WheelForceResult[] = input.wheelContacts.map(contact => {
    const slipRatio = computeSlipRatio(
      contact.wheelAngularVelocityRadS,
      contact.wheelRadiusM,
      contact.localForwardSpeedMps,
    );
    const slipAngle = computeSlipAngle(
      contact.localForwardSpeedMps,
      contact.localLateralSpeedMps,
    );

    const tire = computeTireForces({
      slipRatio,
      slipAngle,
      normalLoadN: contact.normalLoadN,
      tempC: contact.temperatureC,
      wear: contact.wear,
      surface: contact.surface,
      wetness: contact.wetness,
      compound: input.compound,
    });

    return {
      id: contact.id,
      slipRatio,
      slipAngle,
      fxN: tire.fxN,
      fyN: tire.fyN,
    };
  });

  return {
    aero,
    ers,
    wheelForces,
    rearDriveTorqueNm: {
      left: rearLeftTorqueNm,
      right: rearRightTorqueNm,
    },
  };
}

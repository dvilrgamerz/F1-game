/**
 * DVILR GP player handling: responsive simplified bicycle model.
 * Steering maps to front-wheel angle; turning comes from curvature and is
 * limited by available lateral tyre + aerodynamic grip.
 * Not a licensed/telemetry-accurate Formula 1 tyre or suspension model.
 */
export type SteeringState = {
  yawRate: number;
  frontAngle: number;
  lateralG: number;
  saturated: boolean;
};

export type SteeringInput = {
  speed: number; // m/s
  command: number; // -1 = left, +1 = right
  grip: number; // dimensionless tyre/surface grip multiplier
  previousYawRate: number; // rad/s
  dt: number; // seconds
};

const WHEELBASE_M = 3.4;
const G = 9.80665;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

/** Deadzone, rescale and progressive feel for analog gamepad stick input. */
export function shapeStick(value: number, deadzone = 0.08): number {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.abs(clamp(value, -1, 1));
  if (magnitude <= deadzone) return 0;
  return Math.sign(value) * Math.pow((magnitude - deadzone) / (1 - deadzone), 1.18);
}

/** 0.55 rad at low speed, approximately 0.11 rad at 100 m/s. */
export function frontWheelLock(speed: number): number {
  const t = clamp(Math.max(speed, 0) / 100, 0, 1);
  return 0.55 - 0.44 * Math.pow(t, 0.68);
}

export function stepSteering({ speed, command, grip, previousYawRate, dt }: SteeringInput): SteeringState {
  const v = Math.max(0, Number.isFinite(speed) ? speed : 0);
  const steer = clamp(Number.isFinite(command) ? command : 0, -1, 1);
  const gripScale = clamp(Number.isFinite(grip) ? grip : 1, 0.05, 1.35);
  const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  const angle = steer * frontWheelLock(v);
  // 1.5 g at low speed, progressively greater grip with aero at high speed.
  const maxLateralMps2 = (15 + 30 * Math.pow(clamp(v / 95, 0, 1), 2)) * gripScale;
  const geometricYaw = v / WHEELBASE_M * Math.tan(angle);
  const yawLimit = v < 0.5 ? 0 : maxLateralMps2 / Math.max(v, 0.5);
  const targetYaw = clamp(geometricYaw, -yawLimit, yawLimit);
  // At 120 Hz, steering follows input quickly but yaw doesn't snap or oscillate.
  const response = 1 - Math.exp(-step * (v < 20 ? 11 : 9.5));
  const oldYaw = Number.isFinite(previousYawRate) ? previousYawRate : 0;
  const newYaw = oldYaw + (targetYaw - oldYaw) * response;
  return {
    yawRate: newYaw,
    frontAngle: angle,
    lateralG: Math.abs(newYaw * v) / G,
    saturated: Math.abs(geometricYaw) > yawLimit + 0.0001,
  };
}

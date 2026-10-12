import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Test actual checked-in TypeScript model, not a reimplemented formula.
const source = readFileSync(new URL('../src/v3/physics/SteeringModel.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { shapeStick, frontWheelLock, stepSteering } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

function settle(speed, command, grip = 1) {
  let yawRate = 0;
  let result;
  for (let tick = 0; tick < 120; tick++) {
    result = stepSteering({ speed, command, grip, previousYawRate: yawRate, dt: 1/120 });
    yawRate = result.yawRate;
  }
  return result;
}
test('WASD orientation: left gives negative yaw, right positive yaw', () => {
  assert.ok(settle(25, -1).yawRate < -0.4);
  assert.ok(settle(25, 1).yawRate > 0.4);
});
test('player car can turn at low speeds but not spin while stationary', () => {
  assert.ok(settle(12, 1).yawRate > 0.25);
  assert.equal(settle(0, 1).yawRate, 0);
});
test('speed-sensitive lock and lateral grip prevent impossible high-speed spins', () => {
  assert.ok(frontWheelLock(15) > frontWheelLock(85));
  const high = settle(90, 1);
  assert.ok(high.lateralG < 4.7, 'max high-speed lateral G bounded');
  assert.ok(high.yawRate < settle(25, 1).yawRate);
});
test('gravel and worn tyres reduce achievable yaw', () => {
  assert.ok(Math.abs(settle(50, 1, 0.30).yawRate) < Math.abs(settle(50, 1, 1).yawRate));
});
test('stick deadzone filters drift while preserving analog extremes', () => {
  assert.equal(shapeStick(0.05), 0);
  assert.equal(shapeStick(-0.03), 0);
  assert.equal(shapeStick(1), 1);
  assert.equal(shapeStick(-1), -1);
  assert.ok(shapeStick(0.5) > 0 && shapeStick(0.5) < 0.5);
});
test('braking / countersteering response is smooth and finite', () => {
  let yawRate = settle(48, 1).yawRate;
  for (let i = 0; i < 90; i++) {
    const s = stepSteering({ speed: 35, command: -1, grip: .85, previousYawRate: yawRate, dt: 1/120 });
    assert.ok(Number.isFinite(s.yawRate));
    yawRate = s.yawRate;
  }
  assert.ok(yawRate < 0);
});

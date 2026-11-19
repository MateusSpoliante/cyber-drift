import test from 'node:test';
import assert from 'node:assert/strict';
import { stepArcadeVehicle } from '../src/engine/arcadeVehicleMath.js';

const tuning = { mass: 1050, engineForce: 10500, brakeForce: 1700, maxSpeed: 112 };
const velocity = (x = 0, y = 0, z = 0) => ({ x, y, z });
const step = (input, v = velocity(), yaw = 0, dt = 1 / 120, customTuning = tuning) =>
    stepArcadeVehicle({ yaw, velocity: v, input, tuning: customTuning, dt });

test('throttle accelerates forward along the car heading', () => {
    const result = step({ throttle: 1 });
    assert.ok(result.forwardSpeed > 0);
    assert.ok(result.velocity.z > 0);
    assert.equal(result.velocity.x, 0);
});

test('reverse accelerates in the opposite direction', () => {
    const result = step({ reverse: 1 });
    assert.ok(result.forwardSpeed < 0);
    assert.ok(result.velocity.z < 0);
});

test('braking reduces forward speed without instantly reversing', () => {
    const result = step({ brake: 1 }, velocity(0, 0, 12));
    assert.ok(result.forwardSpeed >= 0);
    assert.ok(result.forwardSpeed < 12);
});

test('top speed is capped at the configured maximum', () => {
    const result = step({ throttle: 1 }, velocity(0, 0, 111.99), 0, 1 / 120);
    assert.ok(result.forwardSpeed <= tuning.maxSpeed);
});

test('A/left turns the nose left and D/right turns it right while moving', () => {
    const left = step({ steer: 1 }, velocity(0, 0, 20));
    const right = step({ steer: -1 }, velocity(0, 0, 20));
    assert.ok(left.yaw < 0);
    assert.ok(right.yaw > 0);
});

test('steering direction is naturally inverted while reversing', () => {
    const reverseLeft = step({ steer: 1 }, velocity(0, 0, -20));
    assert.ok(reverseLeft.yaw > 0);
});

test('handbrake preserves more lateral slide than normal grip', () => {
    const initial = velocity(10, 0, 20);
    const normal = step({}, initial, 0, 1 / 30);
    const drift = step({ handbrake: 1 }, initial, 0, 1 / 30);
    assert.ok(Math.abs(drift.lateralSpeed) > Math.abs(normal.lateralSpeed));
});

test('vertical velocity is preserved for Rapier gravity and contact response', () => {
    const result = step({ throttle: 1 }, velocity(0, -1.25, 0));
    assert.equal(result.velocity.y, -1.25);
});

test('invalid frame delta is clamped and does not create a velocity spike', () => {
    const result = step({ throttle: 1 }, velocity(), 0, 10);
    assert.ok(result.forwardSpeed <= (tuning.engineForce / tuning.mass) / 30 + 1e-9);
});

test('one second of throttle produces sustained, finite acceleration', () => {
    let current = velocity();
    let speed = 0;
    for (let i = 0; i < 120; i++) {
        const result = step({ throttle: 1 }, current);
        current = result.velocity;
        speed = result.forwardSpeed;
    }
    assert.ok(speed > 9 && speed < 11);
    assert.ok(Number.isFinite(current.x) && Number.isFinite(current.z));
});

test('steering over multiple fixed steps changes heading smoothly', () => {
    let current = velocity(0, 0, 20);
    let yaw = 0;
    for (let i = 0; i < 120; i++) {
        const result = step({ steer: 1 }, current, yaw);
        current = result.velocity;
        yaw = result.yaw;
    }
    assert.ok(yaw < 0 && yaw > -1);
    assert.ok(Number.isFinite(current.x) && Number.isFinite(current.z));
});

test('chassis, visual body and tyre bottoms align with the road surface', async () => {
    const { getVehicleVerticalAlignment } = await import('../src/engine/arcadeVehicleMath.js');
    const alignment = getVehicleVerticalAlignment();
    assert.ok(alignment.chassisClearance >= 0 && alignment.chassisClearance < 0.01);
    assert.ok(Math.abs(alignment.visualRootError) < 1e-9);
    assert.ok(Math.abs(alignment.wheelBottomError) < 1e-9);
});

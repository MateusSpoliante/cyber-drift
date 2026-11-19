const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function approach(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    if (value > target) return Math.max(target, value - amount);
    return target;
}

/**
 * Deterministic ground-plane vehicle step. Rapier remains responsible for the
 * rigid-body position, gravity and collision response; this function computes
 * the controllable horizontal velocity and yaw for an arcade racing car.
 */
export function stepArcadeVehicle({ yaw, velocity, input, tuning, dt }) {
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 1 / 30);
    const mass = Math.max(1, Number(tuning.mass) || 1050);
    const engineForce = Math.max(0, Number(tuning.engineForce) || 10500);
    const brakeForce = Math.max(0, Number(tuning.brakeForce) || 1700);
    const maxSpeed = Math.max(1, Number(tuning.maxSpeed) || 112);
    const throttle = clamp(Number(input.throttle) || 0, 0, 1);
    const reverse = clamp(Number(input.reverse) || 0, 0, 1);
    const brake = clamp(Number(input.brake) || 0, 0, 1);
    const steer = clamp(Number(input.steer) || 0, -1, 1);
    const handbrake = clamp(Number(input.handbrake) || 0, 0, 1);

    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    let forwardSpeed = velocity.x * forwardX + velocity.z * forwardZ;
    let lateralSpeed = velocity.x * rightX + velocity.z * rightZ;
    const engineAcceleration = engineForce / mass;

    if (brake > 0) {
        const brakeDeceleration = Math.max(4, (brakeForce / mass) * 12);
        forwardSpeed = approach(forwardSpeed, 0, brakeDeceleration * brake * safeDt);
    } else if (throttle > 0) {
        forwardSpeed += engineAcceleration * throttle * safeDt;
    } else if (reverse > 0) {
        forwardSpeed -= engineAcceleration * 0.62 * reverse * safeDt;
    } else {
        const speedRatio = clamp(Math.abs(forwardSpeed) / maxSpeed, 0, 1);
        const rollingAndAirDrag = 0.18 + speedRatio * speedRatio * 1.0;
        forwardSpeed = approach(forwardSpeed, 0, rollingAndAirDrag * safeDt);
    }

    forwardSpeed = clamp(forwardSpeed, -18, maxSpeed);

    // Positive steer is A/left. Positive yaw turns +Z toward +X, so left
    // steering decreases yaw. Reverse naturally swaps the steering direction.
    const steerAuthority = clamp(Math.abs(forwardSpeed) / 5, 0, 1);
    const travelDirection = forwardSpeed < -0.05 ? -1 : 1;
    const nextYaw = yaw - steer * 0.95 * steerAuthority * travelDirection * safeDt;

    // Handbrake reduces lateral grip so the rear can slide without stopping.
    const lateralGrip = handbrake > 0.1 ? 1.45 : 7.5;
    lateralSpeed *= Math.exp(-lateralGrip * safeDt);

    const nextForwardX = Math.sin(nextYaw);
    const nextForwardZ = Math.cos(nextYaw);
    const nextRightX = Math.cos(nextYaw);
    const nextRightZ = -Math.sin(nextYaw);

    return {
        yaw: nextYaw,
        forwardSpeed,
        lateralSpeed,
        velocity: {
            x: nextForwardX * forwardSpeed + nextRightX * lateralSpeed,
            y: Number.isFinite(velocity.y) ? velocity.y : 0,
            z: nextForwardZ * forwardSpeed + nextRightZ * lateralSpeed
        }
    };
}

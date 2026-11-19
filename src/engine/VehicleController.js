import * as THREE from 'three';
import { stepArcadeVehicle } from './arcadeVehicleMath.js';

const DEFAULT_TUNING = {
    mass: 1050,
    engineForce: 10500,
    brakeForce: 1700,
    maxSteerAngle: 0.42,
    wheelRadius: 0.49,
    maxSpeed: 112
};

/**
 * Arcade vehicle controller backed by a Rapier dynamic rigid body.
 *
 * Rapier still resolves the chassis against the road and guardrails. Horizontal
 * driving is deterministic and does not depend on wheel raycasts, which were
 * the source of the intermittent no-traction state.
 */
export class VehicleController {
    constructor({ physics, spawn = { x: 0, y: 1.2, z: 0 }, tuning = {}, visual = null }) {
        if (!physics?.world || !physics?.RAPIER) {
            throw new Error('VehicleController precisa receber uma instância válida de PhysicsWorld.');
        }

        this.physics = physics;
        this.RAPIER = physics.RAPIER;
        this.tuning = { ...DEFAULT_TUNING, ...tuning };
        this.visual = visual;
        // The chassis bottom is 0.50 m below its origin. The visual model is
        // aligned to the same road height, both on asphalt and on the ground.
        this.visualOffset = new THREE.Vector3(0, -0.502, 0);
        this.input = { throttle: 0, reverse: 0, brake: 0, steer: 0, handbrake: 0 };
        this.yaw = spawn.heading ?? 0;
        this.steerAngle = 0;
        this.wheelSpin = 0;

        const { x, y, z } = spawn;
        const spawnRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), this.yaw
        );
        const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setRotation({
                x: spawnRotation.x,
                y: spawnRotation.y,
                z: spawnRotation.z,
                w: spawnRotation.w
            })
            .setLinearDamping(0.025)
            .setAngularDamping(0)
            .setCanSleep(false)
            .setCcdEnabled(true);

        this.body = physics.world.createRigidBody(bodyDesc);
        const chassisCollider = this.RAPIER.ColliderDesc.cuboid(0.92, 0.38, 2.05)
            .setTranslation(0, -0.12, 0)
            .setMass(this.tuning.mass)
            .setFriction(1.1)
            .setRestitution(0.02);
        physics.world.createCollider(chassisCollider, this.body);

        this.previousPosition = new THREE.Vector3(x, y, z);
        this.currentPosition = new THREE.Vector3(x, y, z);
        this.previousRotation = spawnRotation.clone();
        this.currentRotation = spawnRotation.clone();
        this.velocity = new THREE.Vector3();
        this.forwardScratch = new THREE.Vector3(0, 0, 1);
        this.rotationScratch = new THREE.Quaternion();
        this.planarVelocityScratch = new THREE.Vector3();
        this.speedKmh = 0;
        this.slipAngle = 0;
        this.isDrifting = false;
    }

    setInput(input = {}) {
        this.input.throttle = THREE.MathUtils.clamp(input.throttle ?? 0, 0, 1);
        this.input.reverse = THREE.MathUtils.clamp(input.reverse ?? 0, 0, 1);
        this.input.brake = THREE.MathUtils.clamp(input.brake ?? 0, 0, 1);
        this.input.steer = THREE.MathUtils.clamp(input.steer ?? 0, -1, 1);
        this.input.handbrake = THREE.MathUtils.clamp(input.handbrake ?? 0, 0, 1);
    }

    preStep(dt) {
        this.previousPosition.copy(this.currentPosition);
        this.previousRotation.copy(this.currentRotation);

        const rotation = this.body.rotation();
        const currentForward = this.forwardScratch
            .set(0, 0, 1)
            .applyQuaternion(this.rotationScratch.set(rotation.x, rotation.y, rotation.z, rotation.w));
        this.yaw = Math.atan2(currentForward.x, currentForward.z);

        const velocity = this.body.linvel();
        const motion = stepArcadeVehicle({
            yaw: this.yaw,
            velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
            input: this.input,
            tuning: this.tuning,
            dt
        });

        this.yaw = motion.yaw;
        const halfYaw = this.yaw * 0.5;
        this.body.setRotation({
            x: 0,
            y: Math.sin(halfYaw),
            z: 0,
            w: Math.cos(halfYaw)
        }, true);
        // Keep the car upright. Its visible wheels still steer and spin, while
        // the rigid body handles translation, gravity and obstacle collisions.
        this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.body.setLinvel(motion.velocity, true);

        const speedRatio = THREE.MathUtils.clamp(
            Math.abs(motion.forwardSpeed) / this.tuning.maxSpeed, 0, 1
        );
        this.steerAngle = this.input.steer * this.tuning.maxSteerAngle * (1 - speedRatio * 0.35);
        this.wheelSpin += motion.forwardSpeed * dt / Math.max(0.1, this.tuning.wheelRadius);
    }

    postStep() {
        const position = this.body.translation();
        const rotation = this.body.rotation();
        this.currentPosition.set(position.x, position.y, position.z);
        this.currentRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);

        const velocity = this.body.linvel();
        this.velocity.set(velocity.x, velocity.y, velocity.z);
        const forward = this.forwardScratch.set(0, 0, 1).applyQuaternion(this.currentRotation);
        this.speedKmh = this.velocity.dot(forward) * 3.6;

        const planarVelocity = this.planarVelocityScratch.copy(this.velocity).setY(0);
        const planarSpeed = planarVelocity.length();
        this.slipAngle = planarSpeed > 0.5
            ? Math.atan2(
                forward.x * planarVelocity.z - forward.z * planarVelocity.x,
                forward.dot(planarVelocity)
            )
            : 0;
        this.isDrifting = Math.abs(this.slipAngle) > 0.22 && planarSpeed > 7;
        this.yaw = Math.atan2(forward.x, forward.z);
    }

    syncVisual(alpha = 1) {
        if (!this.visual) return;
        const root = this.visual.mesh ?? this.visual;
        root.position.lerpVectors(this.previousPosition, this.currentPosition, alpha).add(this.visualOffset);
        root.quaternion.copy(this.previousRotation).slerp(this.currentRotation, alpha);

        this.visual.steerPivots?.forEach(pivot => {
            pivot.rotation.y = this.steerAngle;
        });
        this.visual.wheelPivots?.forEach((pivot, index) => {
            pivot.position.y = 0.49;
            if (index < 2) pivot.rotation.y = this.steerAngle;
        });
        this.visual.spinMeshes?.forEach(mesh => {
            mesh.rotation.x = this.wheelSpin;
        });
    }

    reset(position, heading = 0) {
        this.yaw = heading;
        const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
        this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
        this.body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true);
        this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.previousPosition.set(position.x, position.y, position.z);
        this.currentPosition.copy(this.previousPosition);
        this.previousRotation.copy(rotation);
        this.currentRotation.copy(rotation);
        this.velocity.set(0, 0, 0);
        this.speedKmh = 0;
        this.slipAngle = 0;
        this.isDrifting = false;
        this.steerAngle = 0;
        this.wheelSpin = 0;
        this.setInput({});
    }

    dispose() {
        this.physics.world.removeRigidBody(this.body);
    }
}

export { DEFAULT_TUNING as DEFAULT_VEHICLE_TUNING };

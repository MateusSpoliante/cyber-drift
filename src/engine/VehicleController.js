import * as THREE from 'three';

const WHEEL_LAYOUT = [
    { x: -1.35, y: 0.63, z:  1.48, front: true },
    { x:  1.35, y: 0.63, z:  1.48, front: true },
    { x: -1.38, y: 0.63, z: -1.72, front: false },
    { x:  1.38, y: 0.63, z: -1.72, front: false }
];

const DEFAULT_TUNING = {
    mass: 1050,
    engineForce: 10500,
    brakeForce: 1700,
    maxSteerAngle: 0.42,
    suspensionRestLength: 0.34,
    wheelRadius: 0.49,
    suspensionStiffness: 28,
    suspensionCompression: 4.4,
    suspensionRelaxation: 5.2,
    maxSuspensionForce: 12000,
    frictionSlip: 2.25,
    sideFriction: 1.15,
    driftSideFriction: 0.72,
    maxSpeed: 112
};

export class VehicleController {
    constructor({ physics, spawn = { x: 0, y: 1.2, z: 0 }, tuning = {}, visual = null }) {
        if (!physics?.world || !physics?.RAPIER) {
            throw new Error('VehicleController precisa receber uma instância válida de PhysicsWorld.');
        }

        this.physics = physics;
        this.RAPIER = physics.RAPIER;
        this.tuning = { ...DEFAULT_TUNING, ...tuning };
        this.visual = visual;
        this.visualOffset = new THREE.Vector3(0, -0.56, 0);
        this.input = { throttle: 0, reverse: 0, brake: 0, steer: 0, handbrake: 0 };

        const { x, y, z, heading = 0 } = spawn;
        const spawnRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
        const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setRotation({
                x: spawnRotation.x,
                y: spawnRotation.y,
                z: spawnRotation.z,
                w: spawnRotation.w
            })
            .setLinearDamping(0.08)
            .setAngularDamping(1.8)
            .setCanSleep(false)
            .setCcdEnabled(true);

        this.body = physics.world.createRigidBody(bodyDesc);
        const chassisCollider = this.RAPIER.ColliderDesc.cuboid(0.92, 0.28, 2.05)
            .setTranslation(0, -0.12, 0)
            .setMass(this.tuning.mass)
            .setFriction(0.7)
            .setRestitution(0.02);
        physics.world.createCollider(chassisCollider, this.body);

        this.vehicle = physics.world.createVehicleController(this.body);
        this.vehicle.indexUpAxis = 1;
        // Mantém o eixo dianteiro padrão do Rapier. O índice só altera o sinal
        // de currentVehicleSpeed; a direção real é definida pela orientação do chassi.

        WHEEL_LAYOUT.forEach((wheel, index) => {
            this.vehicle.addWheel(
                { x: wheel.x, y: wheel.y, z: wheel.z },
                { x: 0, y: -1, z: 0 },
                { x: -1, y: 0, z: 0 },
                this.tuning.suspensionRestLength,
                this.tuning.wheelRadius
            );
            this.vehicle.setWheelSuspensionStiffness(index, this.tuning.suspensionStiffness);
            this.vehicle.setWheelSuspensionCompression(index, this.tuning.suspensionCompression);
            this.vehicle.setWheelSuspensionRelaxation(index, this.tuning.suspensionRelaxation);
            this.vehicle.setWheelMaxSuspensionForce(index, this.tuning.maxSuspensionForce);
            this.vehicle.setWheelMaxSuspensionTravel(index, 0.22);
            this.vehicle.setWheelFrictionSlip(index, this.tuning.frictionSlip);
            this.vehicle.setWheelSideFrictionStiffness(index, this.tuning.sideFriction);
        });

        this.previousPosition = new THREE.Vector3(x, y, z);
        this.currentPosition = new THREE.Vector3(x, y, z);
        this.previousRotation = new THREE.Quaternion();
        this.currentRotation = new THREE.Quaternion();
        this.velocity = new THREE.Vector3();
        this.forwardScratch = new THREE.Vector3(0, 0, 1);
        this.planarVelocityScratch = new THREE.Vector3();
        this.speedKmh = 0;
        this.slipAngle = 0;
        this.isDrifting = false;
    }

    setInput(input) {
        this.input.throttle = THREE.MathUtils.clamp(input.throttle ?? 0, 0, 1);
        this.input.reverse = THREE.MathUtils.clamp(input.reverse ?? 0, 0, 1);
        this.input.brake = THREE.MathUtils.clamp(input.brake ?? 0, 0, 1);
        this.input.steer = THREE.MathUtils.clamp(input.steer ?? 0, -1, 1);
        this.input.handbrake = THREE.MathUtils.clamp(input.handbrake ?? 0, 0, 1);
    }

    preStep(dt) {
        this.previousPosition.copy(this.currentPosition);
        this.previousRotation.copy(this.currentRotation);

        const speed = this.vehicle.currentVehicleSpeed();
        const speedRatio = THREE.MathUtils.clamp(Math.abs(speed) / this.tuning.maxSpeed, 0, 1);
        const steerAngle = this.input.steer * this.tuning.maxSteerAngle * (1 - speedRatio * 0.35);
        const engineForce = (this.input.throttle - this.input.reverse * 0.62) * this.tuning.engineForce;
        const brakeForce = this.input.brake * this.tuning.brakeForce + this.input.handbrake * this.tuning.brakeForce * 1.8;
        const rearGrip = this.input.handbrake > 0.1 ? this.tuning.driftSideFriction : this.tuning.sideFriction;

        for (let i = 0; i < 4; i++) {
            this.vehicle.setWheelSteering(i, i < 2 ? steerAngle : 0);
            this.vehicle.setWheelEngineForce(i, i >= 2 ? engineForce * 0.5 : 0);
            this.vehicle.setWheelBrake(i, brakeForce * (i >= 2 && this.input.handbrake > 0.1 ? 1.6 : 1));
            this.vehicle.setWheelSideFrictionStiffness(i, i >= 2 ? rearGrip : this.tuning.sideFriction);
        }

        this.vehicle.updateVehicle(dt);
    }

    postStep() {
        const position = this.body.translation();
        const rotation = this.body.rotation();
        this.currentPosition.set(position.x, position.y, position.z);
        this.currentRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);

        const velocity = this.body.linvel();
        this.velocity.set(velocity.x, velocity.y, velocity.z);
        this.speedKmh = this.vehicle.currentVehicleSpeed() * 3.6;

        const forward = this.forwardScratch.set(0, 0, 1).applyQuaternion(this.currentRotation);
        const planarVelocity = this.planarVelocityScratch.copy(this.velocity).setY(0);
        const velocityLength = planarVelocity.length();
        this.slipAngle = velocityLength > 0.5
            ? Math.atan2(forward.x * planarVelocity.z - forward.z * planarVelocity.x, forward.dot(planarVelocity))
            : 0;
        this.isDrifting = Math.abs(this.slipAngle) > 0.22 && velocityLength > 7;
    }

    syncVisual(alpha = 1) {
        if (!this.visual) return;
        const root = this.visual.mesh ?? this.visual;
        root.position.lerpVectors(this.previousPosition, this.currentPosition, alpha).add(this.visualOffset);
        root.quaternion.copy(this.previousRotation).slerp(this.currentRotation, alpha);

        if (this.visual.steerPivots) {
            this.visual.steerPivots.forEach((pivot, index) => {
                pivot.rotation.y = this.vehicle.wheelSteering(index) ?? 0;
            });
        }
        for (let index = 0; index < 4; index++) {
            const suspensionLength = this.vehicle.wheelSuspensionLength(index);
            const wheelSteering = this.vehicle.wheelSteering(index) ?? 0;
            const wheelRotation = this.vehicle.wheelRotation(index) ?? 0;

            if (this.visual.wheelPivots?.[index] && Number.isFinite(suspensionLength)) {
                this.visual.wheelPivots[index].position.y = 0.83 - suspensionLength;
            }
            if (this.visual.wheelPivots?.[index] && index < 2) {
                this.visual.wheelPivots[index].rotation.y = wheelSteering;
            }
            if (this.visual.spinMeshes?.[index]) {
                this.visual.spinMeshes[index].rotation.x = wheelRotation;
            }
        }
    }

    reset(position, heading = 0) {
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
        this.setInput({});
    }

    getWheelState(index) {
        if (index < 0 || index >= 4) return null;
        const contact = this.vehicle.wheelContactPoint(index);
        return {
            inContact: this.vehicle.wheelIsInContact(index),
            rotation: this.vehicle.wheelRotation(index),
            suspensionLength: this.vehicle.wheelSuspensionLength(index),
            contactPoint: contact ? new THREE.Vector3(contact.x, contact.y, contact.z) : null
        };
    }

    dispose() {
        this.physics.world.removeVehicleController(this.vehicle);
        this.physics.world.removeRigidBody(this.body);
    }
}

export { DEFAULT_TUNING as DEFAULT_VEHICLE_TUNING, WHEEL_LAYOUT };

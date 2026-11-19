import * as THREE from 'three';

export class CameraRig {
    constructor(camera, {
        distance = 11.5,
        height = 4.4,
        lookAhead = 7,
        spring = 6.5,
        baseFov = 62,
        maxFov = 82
    } = {}) {
        this.camera = camera;
        this.distance = distance;
        this.height = height;
        this.lookAhead = lookAhead;
        this.spring = spring;
        this.baseFov = baseFov;
        this.maxFov = maxFov;
        this.velocity = new THREE.Vector3();
        this.desiredPosition = new THREE.Vector3();
        this.lookTarget = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.offset = new THREE.Vector3(0, height, -distance);
    }

    update(target, speedKmh, dt, shake = 0) {
        if (!target) return;

        target.getWorldDirection(this.forward).normalize();
        this.offset.set(0, this.height, -this.distance).applyQuaternion(target.quaternion);
        this.desiredPosition.copy(target.position).add(this.offset);

        // Critically damped spring arm: stable even when frame time varies.
        const omega = this.spring;
        const displacement = this.desiredPosition.clone().sub(this.camera.position);
        const acceleration = displacement.multiplyScalar(omega * omega)
            .addScaledVector(this.velocity, -2 * omega);
        this.velocity.addScaledVector(acceleration, dt);
        this.camera.position.addScaledVector(this.velocity, dt);

        this.lookTarget.copy(target.position).addScaledVector(this.forward, this.lookAhead);
        this.lookTarget.y += 0.8;
        this.camera.lookAt(this.lookTarget);

        const speedRatio = THREE.MathUtils.clamp(Math.abs(speedKmh) / 320, 0, 1);
        const desiredFov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, speedRatio);
        this.camera.fov += (desiredFov - this.camera.fov) * (1 - Math.exp(-4.5 * dt));
        this.camera.updateProjectionMatrix();

        if (shake > 0) {
            const amount = Math.min(0.12, shake);
            this.camera.position.x += (Math.random() - 0.5) * amount;
            this.camera.position.y += (Math.random() - 0.5) * amount;
        }
    }

    reset(target) {
        if (!target) return;
        this.velocity.set(0, 0, 0);
        this.offset.set(0, this.height, -this.distance).applyQuaternion(target.quaternion);
        this.camera.position.copy(target.position).add(this.offset);
        this.camera.lookAt(target.position);
    }
}

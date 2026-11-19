import * as THREE from 'three';

/** Câmera de perseguição, distante e cockpit com suavização independente do FPS. */
export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.up = new THREE.Vector3(0, 1, 0);
        this.hoodOffset = new THREE.Vector3();
        this.lookAhead = new THREE.Vector3();
        this.lookTarget = new THREE.Vector3();
    }

    update(player, cameraMode, dt, cameraShake = 0, maxSpeed = 1) {
        const heading = player.heading;
        if (cameraMode === 2) {
            this.hoodOffset.set(0, 1.55, 0.65).applyAxisAngle(this.up, heading);
            this.camera.position.copy(player.pos).add(this.hoodOffset);
            this.lookAhead.set(0, 1.35, 28).applyAxisAngle(this.up, heading).add(player.pos);
            this.camera.lookAt(this.lookAhead);
        } else {
            const distance = cameraMode === 0 ? 10.5 : 18.5;
            const height = cameraMode === 0 ? 4.2 : 8.5;
            const desiredX = player.pos.x - Math.sin(heading) * distance;
            const desiredZ = player.pos.z - Math.cos(heading) * distance;
            const desiredY = player.pos.y + height;
            const smooth = 1 - Math.exp(-10.5 * dt);
            this.camera.position.x += (desiredX - this.camera.position.x) * smooth;
            this.camera.position.y += (desiredY - this.camera.position.y) * smooth;
            this.camera.position.z += (desiredZ - this.camera.position.z) * smooth;
            this.lookTarget.set(
                player.pos.x + Math.sin(heading) * 7,
                player.pos.y + 1.3,
                player.pos.z + Math.cos(heading) * 7
            );
            this.camera.lookAt(this.lookTarget);
        }

        const baseFov = cameraMode === 2 ? 74 : 62;
        const speedNorm = Math.abs(player.speed) / maxSpeed;
        const targetFov = baseFov + speedNorm * 18 + (player.isNitro ? 11 : 0);
        this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-8.5 * dt));
        this.camera.updateProjectionMatrix();

        if (cameraShake > 0) {
            this.camera.position.x += (Math.random() - 0.5) * cameraShake;
            this.camera.position.y += (Math.random() - 0.5) * cameraShake;
            cameraShake = Math.max(0, cameraShake - dt * 1.8);
        }
        return cameraShake;
    }
}

import * as THREE from 'three';

export class VFXSystem {
    constructor(scene, { smokeCount = 180, skidCapacity = 6000 } = {}) {
        this.scene = scene;
        this.smokeCount = smokeCount;
        this.smokeCursor = 0;
        this.smokeLife = new Float32Array(smokeCount);
        this.smokePositions = Array.from({ length: smokeCount }, () => new THREE.Vector3());
        this.smokeVelocity = Array.from({ length: smokeCount }, () => new THREE.Vector3());
        this.dummy = new THREE.Object3D();

        const smokeGeometry = new THREE.SphereGeometry(0.42, 7, 6);
        const smokeMaterial = new THREE.MeshStandardMaterial({
            color: 0x9ba4ad,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
            roughness: 1
        });
        this.smoke = new THREE.InstancedMesh(smokeGeometry, smokeMaterial, smokeCount);
        this.smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.smoke.count = smokeCount;
        this.scene.add(this.smoke);

        this.skidCapacity = skidCapacity;
        this.skidPositions = new Float32Array(skidCapacity * 2 * 3);
        this.skidGeometry = new THREE.BufferGeometry();
        this.skidGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(this.skidPositions, 3).setUsage(THREE.DynamicDrawUsage)
        );
        this.skidGeometry.setDrawRange(0, 0);
        this.skidMaterial = new THREE.LineBasicMaterial({
            color: 0x17191c,
            transparent: true,
            opacity: 0.55
        });
        this.skidMarks = new THREE.LineSegments(this.skidGeometry, this.skidMaterial);
        this.scene.add(this.skidMarks);
        this.skidCount = 0;

        for (let i = 0; i < smokeCount; i++) {
            this.dummy.position.set(0, -10000, 0);
            this.dummy.scale.setScalar(0.001);
            this.dummy.updateMatrix();
            this.smoke.setMatrixAt(i, this.dummy.matrix);
        }
        this.smoke.instanceMatrix.needsUpdate = true;
    }

    emitSmoke(position, velocity = new THREE.Vector3(0, 1.1, 0), scale = 1) {
        const index = this.smokeCursor;
        this.smokeCursor = (this.smokeCursor + 1) % this.smokeCount;
        this.smokeLife[index] = 1;
        this.smokePositions[index].copy(position);
        this.smokeVelocity[index].copy(velocity);
        this.writeSmokeMatrix(index, 0.2 * scale);
    }

    writeSmokeMatrix(index, scale) {
        this.dummy.position.copy(this.smokePositions[index]);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        this.smoke.setMatrixAt(index, this.dummy.matrix);
    }

    addSkidSegment(left, right) {
        if (this.skidCount >= this.skidCapacity) return;
        const offset = this.skidCount * 6;
        this.skidPositions.set([
            left.x, left.y + 0.018, left.z,
            right.x, right.y + 0.018, right.z
        ], offset);
        this.skidCount++;
        this.skidGeometry.attributes.position.needsUpdate = true;
        this.skidGeometry.setDrawRange(0, this.skidCount * 2);
        this.skidGeometry.computeBoundingSphere();
    }

    update(dt) {
        for (let i = 0; i < this.smokeCount; i++) {
            if (this.smokeLife[i] <= 0) continue;
            this.smokeLife[i] = Math.max(0, this.smokeLife[i] - dt * 0.72);
            if (this.smokeLife[i] === 0) {
                this.smokePositions[i].set(0, -10000, 0);
                this.writeSmokeMatrix(i, 0.001);
                continue;
            }
            this.smokePositions[i].addScaledVector(this.smokeVelocity[i], dt);
            const age = 1 - this.smokeLife[i];
            this.writeSmokeMatrix(i, 0.18 + age * 0.85);
        }
        this.smoke.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.smoke);
        this.scene.remove(this.skidMarks);
        this.smoke.geometry.dispose();
        this.smoke.material.dispose();
        this.skidGeometry.dispose();
        this.skidMaterial.dispose();
    }
}

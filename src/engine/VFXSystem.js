import * as THREE from 'three';

export class VFXSystem {
    constructor(scene, { smokeCount = 180, sparkCount = 96, skidCapacity = 6000 } = {}) {
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
        this.smoke.frustumCulled = false;
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
        // A conservative fixed bound avoids rescanning the entire trail buffer
        // every time a new tyre mark is appended.
        this.skidGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2400);
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

        this.sparkCount = sparkCount;
        this.sparkCursor = 0;
        this.sparkLife = new Float32Array(sparkCount);
        this.sparkPositions = Array.from({ length: sparkCount }, () => new THREE.Vector3());
        this.sparkVelocity = Array.from({ length: sparkCount }, () => new THREE.Vector3());
        const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffa24a, toneMapped: false });
        this.sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 5, 5), sparkMaterial, sparkCount);
        this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.sparks.frustumCulled = false;
        for (let i = 0; i < sparkCount; i++) {
            this.dummy.position.set(0, -10000, 0);
            this.dummy.scale.setScalar(0.001);
            this.dummy.updateMatrix();
            this.sparks.setMatrixAt(i, this.dummy.matrix);
        }
        this.sparks.instanceMatrix.needsUpdate = true;
        this.scene.add(this.sparks);
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

    emitSparks(position, normal = new THREE.Vector3(0, 1, 0), intensity = 1) {
        const count = Math.min(8, Math.max(2, Math.round(3 * intensity)));
        for (let particle = 0; particle < count; particle++) {
            const index = this.sparkCursor;
            this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount;
            this.sparkLife[index] = 0.35 + Math.random() * 0.3;
            this.sparkPositions[index].copy(position);
            this.sparkVelocity[index].set(
                (Math.random() - 0.5) * 9 + normal.x * 2,
                2 + Math.random() * 7 + normal.y * 2,
                (Math.random() - 0.5) * 9 + normal.z * 2
            );
            this.writeSparkMatrix(index, 0.7 + Math.random() * 0.8);
        }
    }

    writeSparkMatrix(index, scale) {
        this.dummy.position.copy(this.sparkPositions[index]);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        this.sparks.setMatrixAt(index, this.dummy.matrix);
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
    }

    clear() {
        for (let i = 0; i < this.smokeCount; i++) {
            this.smokeLife[i] = 0;
            this.smokePositions[i].set(0, -10000, 0);
            this.writeSmokeMatrix(i, 0.001);
        }
        for (let i = 0; i < this.sparkCount; i++) {
            this.sparkLife[i] = 0;
            this.sparkPositions[i].set(0, -10000, 0);
            this.writeSparkMatrix(i, 0.001);
        }
        this.smoke.instanceMatrix.needsUpdate = true;
        this.sparks.instanceMatrix.needsUpdate = true;
        this.skidCount = 0;
        this.skidPositions.fill(0);
        this.skidGeometry.attributes.position.needsUpdate = true;
        this.skidGeometry.setDrawRange(0, 0);
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

        for (let i = 0; i < this.sparkCount; i++) {
            if (this.sparkLife[i] <= 0) continue;
            this.sparkLife[i] = Math.max(0, this.sparkLife[i] - dt * 2.8);
            if (this.sparkLife[i] === 0) {
                this.sparkPositions[i].set(0, -10000, 0);
                this.writeSparkMatrix(i, 0.001);
                continue;
            }
            this.sparkVelocity[i].y -= 14 * dt;
            this.sparkPositions[i].addScaledVector(this.sparkVelocity[i], dt);
            this.writeSparkMatrix(i, this.sparkLife[i] * 0.9);
        }
        this.sparks.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.smoke);
        this.scene.remove(this.sparks);
        this.scene.remove(this.skidMarks);
        this.smoke.geometry.dispose();
        this.smoke.material.dispose();
        this.sparks.geometry.dispose();
        this.sparks.material.dispose();
        this.skidGeometry.dispose();
        this.skidMaterial.dispose();
    }
}

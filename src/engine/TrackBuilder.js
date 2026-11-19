import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export class TrackBuilder {
    constructor({ scene, physics, width = 14, samples = 900, banking = 0.12 } = {}) {
        if (!scene || !physics?.world || !physics?.RAPIER) {
            throw new Error('TrackBuilder requer scene e PhysicsWorld válidos.');
        }
        this.scene = scene;
        this.physics = physics;
        this.width = width;
        this.samples = samples;
        this.banking = banking;
        this.group = new THREE.Group();
        this.group.name = 'nextgen-track';
        this.scene.add(this.group);
        this.physicsBodies = [];
        this.physicsColliders = [];
        this.trackCollider = null;
    }

    build(controlPoints) {
        if (!Array.isArray(controlPoints) || controlPoints.length < 4) {
            throw new Error('TrackBuilder requer pelo menos quatro pontos [x, y, z].');
        }

        const points = controlPoints.map(point => new THREE.Vector3(point[0], point[1] ?? 0, point[2]));
        const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
        const curveLength = curve.getLength();
        const frames = [];
        const positions = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= this.samples; i++) {
            const t = i / this.samples;
            const center = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t).normalize();
            const curvature = this.measureCurvature(curve, curveLength, t);
            const bankAngle = THREE.MathUtils.clamp(curvature * 8 * this.banking, -0.24, 0.24);
            const up = UP.clone().applyAxisAngle(tangent, bankAngle).normalize();
            const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const leftEdge = center.clone().addScaledVector(right, -this.width * 0.5);
            const rightEdge = center.clone().addScaledVector(right, this.width * 0.5);

            positions.push(leftEdge.x, leftEdge.y, leftEdge.z, rightEdge.x, rightEdge.y, rightEdge.z);
            uvs.push(0, t * 60, 1, t * 60);

            if (i < this.samples) {
                const a = i * 2;
                // Counter-clockwise winding: surface normal points upward.
                indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }

            frames.push({ center, tangent, right, up, bankAngle, t });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const asphalt = new THREE.MeshStandardMaterial({
            color: 0x34383d,
            roughness: 0.86,
            metalness: 0.06
        });
        const road = new THREE.Mesh(geometry, asphalt);
        road.name = 'track-asphalt';
        road.receiveShadow = true;
        this.group.add(road);

        const collider = this.physics.world.createCollider(
            this.physics.RAPIER.ColliderDesc.trimesh(
                new Float32Array(positions),
                new Uint32Array(indices)
            ).setFriction(1.25).setRestitution(0)
        );
        this.physicsColliders.push(collider);
        this.trackCollider = collider;

        this.addKerbs(frames);
        this.addGuardRails(frames);
        return { curve, frames, road, collider, group: this.group };
    }

    measureCurvature(curve, curveLength, t) {
        const delta = 0.002;
        const before = curve.getTangentAt((t - delta + 1) % 1);
        const after = curve.getTangentAt((t + delta) % 1);
        const distance = curveLength * delta * 2;
        return before.angleTo(after) / Math.max(0.001, distance);
    }

    addKerbs(frames) {
        const blockLength = Math.max(1, Math.floor(frames.length / 180));
        const segmentCount = Math.ceil((frames.length - 1) / blockLength);
        const redMaterial = new THREE.MeshStandardMaterial({ color: 0xe64b42, roughness: 0.82 });
        const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.82 });
        const geometry = new THREE.BoxGeometry(1.15, 0.12, 1);
        const red = new THREE.InstancedMesh(geometry, redMaterial, segmentCount * 2);
        const white = new THREE.InstancedMesh(geometry, whiteMaterial, segmentCount * 2);
        const dummy = new THREE.Object3D();
        let redIndex = 0;
        let whiteIndex = 0;

        for (let i = 0; i < frames.length - blockLength; i += blockLength) {
            const a = frames[i];
            const b = frames[Math.min(i + blockLength, frames.length - 1)];
            const midpoint = a.center.clone().lerp(b.center, 0.5);
            const tangent = a.tangent.clone().lerp(b.tangent, 0.5).normalize();
            const length = a.center.distanceTo(b.center) + 0.04;
            const materialIndex = Math.floor(i / blockLength) % 2;
            const target = materialIndex === 0 ? red : white;
            for (const side of [-1, 1]) {
                const position = midpoint.clone().addScaledVector(a.right, side * (this.width * 0.5 + 0.45));
                position.y += 0.035;
                dummy.position.copy(position);
                dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
                dummy.scale.set(1, 1, length);
                dummy.updateMatrix();
                if (target === red) target.setMatrixAt(redIndex++, dummy.matrix);
                else target.setMatrixAt(whiteIndex++, dummy.matrix);
            }
        }

        red.count = redIndex;
        white.count = whiteIndex;
        red.instanceMatrix.needsUpdate = true;
        white.instanceMatrix.needsUpdate = true;
        red.castShadow = white.castShadow = false;
        red.receiveShadow = white.receiveShadow = true;
        this.group.add(red, white);
    }

    addGuardRails(frames) {
        const material = new THREE.MeshStandardMaterial({
            color: 0x8b969e,
            metalness: 0.72,
            roughness: 0.32
        });
        const stride = 8;
        const segmentCount = Math.ceil((frames.length - 1) / stride);
        const geometry = new THREE.BoxGeometry(0.22, 0.72, 1);
        const dummy = new THREE.Object3D();

        for (const side of [-1, 1]) {
            const instances = new THREE.InstancedMesh(geometry, material, segmentCount);
            let count = 0;

            for (let i = 0; i < frames.length - stride; i += stride) {
                const a = frames[i];
                const b = frames[i + stride];
                const midpoint = a.center.clone().lerp(b.center, 0.5);
                const tangent = a.tangent.clone().lerp(b.tangent, 0.5).normalize();
                const length = a.center.distanceTo(b.center) + 0.2;
                const position = midpoint.clone().addScaledVector(a.right, side * (this.width * 0.5 + 2));
                position.y += 0.55;

                dummy.position.copy(position);
                dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
                dummy.scale.set(1, 1, length);
                dummy.updateMatrix();
                instances.setMatrixAt(count++, dummy.matrix);

                const rotation = new THREE.Quaternion().setFromAxisAngle(UP, dummy.rotation.y);
                const body = this.physics.world.createRigidBody(
                    this.physics.RAPIER.RigidBodyDesc.fixed()
                        .setTranslation(position.x, position.y, position.z)
                        .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
                );
                const collider = this.physics.world.createCollider(
                    this.physics.RAPIER.ColliderDesc.cuboid(0.11, 0.36, length * 0.5)
                        .setFriction(0.65)
                        .setRestitution(0.08),
                    body
                );
                this.physicsBodies.push(body);
                this.physicsColliders.push(collider);
            }

            instances.count = count;
            instances.instanceMatrix.needsUpdate = true;
            instances.castShadow = true;
            instances.receiveShadow = true;
            this.group.add(instances);
        }
    }

    dispose() {
        if (this.trackCollider) {
            this.physics.world.removeCollider(this.trackCollider, true);
            this.trackCollider = null;
        }
        for (const body of this.physicsBodies) {
            this.physics.world.removeRigidBody(body);
        }
        this.physicsBodies.length = 0;
        this.physicsColliders.length = 0;

        this.group.traverse(object => {
            if (object.geometry && !object.geometry.userData.shared) object.geometry.dispose();
            if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
            else if (object.material) object.material.dispose();
        });
        this.scene.remove(this.group);
    }
}

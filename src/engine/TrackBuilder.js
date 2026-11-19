import * as THREE from 'three';

export class TrackBuilder {
    constructor({ scene, physics, width = 14, samples = 900, banking = 0.12 }) {
        this.scene = scene;
        this.physics = physics;
        this.width = width;
        this.samples = samples;
        this.banking = banking;
        this.group = new THREE.Group();
        this.group.name = 'nextgen-track';
        scene.add(this.group);
    }

    build(controlPoints) {
        if (!Array.isArray(controlPoints) || controlPoints.length < 4) {
            throw new Error('TrackBuilder requer pelo menos quatro pontos de controle [x, y, z].');
        }

        const points = controlPoints.map(point => new THREE.Vector3(point[0], point[1] ?? 0, point[2]));
        const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
        const positions = [];
        const uvs = [];
        const indices = [];
        const vertices = [];
        const indicesForPhysics = [];
        const frames = [];

        for (let i = 0; i <= this.samples; i++) {
            const t = i / this.samples;
            const center = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t).normalize();
            const horizontalRight = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            const curvature = this.measureCurvature(curve, t);
            const bankAngle = THREE.MathUtils.clamp(curvature * 8 * this.banking, -0.24, 0.24);
            const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(tangent, bankAngle).normalize();
            const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const halfWidth = this.width * 0.5;
            const left = center.clone().addScaledVector(right, -halfWidth);
            const rightEdge = center.clone().addScaledVector(right, halfWidth);

            positions.push(left.x, left.y, left.z, rightEdge.x, rightEdge.y, rightEdge.z);
            vertices.push(left.x, left.y, left.z, rightEdge.x, rightEdge.y, rightEdge.z);
            uvs.push(0, t * 60, 1, t * 60);

            if (i < this.samples) {
                const a = i * 2;
                indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
                indicesForPhysics.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }

            frames.push({ center, tangent, right, up, bankAngle, t });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const asphalt = new THREE.MeshStandardMaterial({
            color: 0x30343a,
            roughness: 0.88,
            metalness: 0.04
        });
        const road = new THREE.Mesh(geometry, asphalt);
        road.name = 'track-asphalt';
        road.receiveShadow = true;
        this.group.add(road);

        const physicsVertices = new Float32Array(vertices);
        const physicsIndices = new Uint32Array(indicesForPhysics);
        const trackCollider = this.physics.world.createCollider(
            this.physics.RAPIER.ColliderDesc.trimesh(physicsVertices, physicsIndices)
                .setFriction(1.35)
                .setRestitution(0)
        );

        this.addKerbs(frames);
        this.addGuardRails(frames);
        return { curve, frames, road, trackCollider, group: this.group };
    }

    measureCurvature(curve, t) {
        const delta = 0.002;
        const before = curve.getTangentAt((t - delta + 1) % 1);
        const after = curve.getTangentAt((t + delta) % 1);
        const distance = curve.getLength() * delta * 2;
        return before.angleTo(after) / Math.max(0.001, distance);
    }

    addKerbs(frames) {
        const red = new THREE.MeshStandardMaterial({ color: 0xe64b42, roughness: 0.82 });
        const white = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.82 });
        const blockLength = Math.max(1, Math.floor(frames.length / 180));

        for (let i = 0; i < frames.length - blockLength; i += blockLength) {
            const frameA = frames[i];
            const frameB = frames[Math.min(i + blockLength, frames.length - 1)];
            for (const side of [-1, 1]) {
                const midpoint = frameA.center.clone().lerp(frameB.center, 0.5);
                const tangent = frameA.tangent.clone().lerp(frameB.tangent, 0.5).normalize();
                const direction = frameA.right.clone().multiplyScalar(side);
                const length = frameA.center.distanceTo(frameB.center) + 0.04;
                const curb = new THREE.Mesh(
                    new THREE.BoxGeometry(1.15, 0.12, length),
                    (Math.floor(i / blockLength) % 2) ? white : red
                );
                curb.position.copy(midpoint).addScaledVector(direction, this.width * 0.5 + 0.45);
                curb.position.y += 0.035;
                curb.rotation.y = Math.atan2(tangent.x, tangent.z);
                curb.receiveShadow = true;
                this.group.add(curb);
            }
        }
    }

    addGuardRails(frames) {
        const material = new THREE.MeshStandardMaterial({ color: 0x8b969e, metalness: 0.72, roughness: 0.32 });
        const stride = 5;
        for (const side of [-1, 1]) {
            for (let i = 0; i < frames.length - stride; i += stride) {
                const a = frames[i];
                const b = frames[i + stride];
                const midpoint = a.center.clone().lerp(b.center, 0.5);
                const tangent = a.tangent.clone().lerp(b.tangent, 0.5).normalize();
                const direction = a.right.clone().multiplyScalar(side);
                const rail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 0.72, a.center.distanceTo(b.center) + 0.2),
                    material
                );
                rail.position.copy(midpoint).addScaledVector(direction, this.width * 0.5 + 2.0);
                rail.position.y += 0.55;
                rail.rotation.y = Math.atan2(tangent.x, tangent.z);
                rail.castShadow = true;
                rail.receiveShadow = true;
                this.group.add(rail);

                const halfExtents = { x: 0.11, y: 0.36, z: (a.center.distanceTo(b.center) + 0.2) * 0.5 };
                const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rail.rotation.y);
                const body = this.physics.world.createRigidBody(
                    this.physics.RAPIER.RigidBodyDesc.fixed()
                        .setTranslation(rail.position.x, rail.position.y, rail.position.z)
                        .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
                );
                this.physics.world.createCollider(
                    this.physics.RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                        .setFriction(0.65)
                        .setRestitution(0.08),
                    body
                );
            }
        }
    }

    dispose() {
        this.group.traverse(object => {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
            else object.material?.dispose();
        });
        this.scene.remove(this.group);
    }
}

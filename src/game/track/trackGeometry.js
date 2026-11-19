import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;

function createRibbonGeometry(positions, indices, uvs = null, colors = null) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function addRibbonQuad(target, a0, a1, b0, b1, uvA = 0, uvB = 1) {
    const base = target.positions.length / 3;
    target.positions.push(
        a0.x, a0.y, a0.z, a1.x, a1.y, a1.z,
        b0.x, b0.y, b0.z, b1.x, b1.y, b1.z
    );
    if (target.uvs) target.uvs.push(0, uvA, 1, uvA, 0, uvB, 1, uvB);
    target.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
}

function makeSurface() {
    return { positions: [], indices: [], uvs: [] };
}

/**
 * Builds a continuous track ribbon. Road edges, kerbs and barriers share the
 * same sampled cross-sections, so they cannot drift away from the circuit.
 * No gravel apron is generated: kerbs sit directly beside the asphalt and
 * guardrails sit immediately outside the kerbs.
 */
export function buildTrackGeometry({
    trackSamples,
    trackCurve,
    trackWorld,
    trackConfig,
    roadHalfWidth,
    wallOffset: _wallOffset,
    createAsphaltTexture
}) {
    const count = trackSamples.length;
    if (count < 8) throw new Error('Track needs at least 8 valid samples.');

    const curbWidth = 1.05;
    const roadY = 0.058;
    const curbY = 0.072;
    const barrierOffset = 0.32;
    const barrierHeight = 0.92;
    const railHeight = 1.08;
    const totalLength = Math.max(1, trackCurve.getLength());

    const road = makeSurface();
    const curbs = { ...makeSurface(), colors: [] };
    const edgeLines = makeSurface();
    const barriers = { positions: [], indices: [] };
    const rails = { positions: [], indices: [] };
    const stations = [];

    const colorA = new THREE.Color(trackConfig.curbA);
    const colorB = new THREE.Color(trackConfig.curbB);

    for (let i = 0; i < count; i++) {
        const sample = trackSamples[i];
        if (!sample?.pt || !sample?.right ||
            !Number.isFinite(sample.pt.x) || !Number.isFinite(sample.pt.y) ||
            !Number.isFinite(sample.pt.z)) {
            throw new Error(`Invalid track sample at index ${i}.`);
        }

        const right = sample.right.clone();
        right.y = 0;
        if (right.lengthSq() < 1e-8) throw new Error(`Invalid track normal at index ${i}.`);
        right.normalize();

        // Curvature never changes the track width. Only a real nearby
        // self-crossing/parallel section may apply a controlled clearance trim.
        const clearance = clamp(Number.isFinite(sample.clearanceScale) ? sample.clearanceScale : 1, 0.06, 1);
        const half = roadHalfWidth * clearance;
        const curb = curbWidth * clearance;
        const center = sample.pt;
        const v = (i / count) * (totalLength / 22);
        const at = (offset, y) => new THREE.Vector3(
            center.x + right.x * offset,
            center.y + y,
            center.z + right.z * offset
        );

        stations.push({
            center,
            right,
            half,
            curb,
            v,
            left: at(-half, roadY),
            rightEdge: at(half, roadY),
            curbLeft: at(-(half + curb), curbY),
            curbRight: at(half + curb, curbY),
            lineLeftA: at(-half + 0.18, roadY + 0.008),
            lineLeftB: at(-half + 0.34, roadY + 0.008),
            lineRightA: at(half - 0.34, roadY + 0.008),
            lineRightB: at(half - 0.18, roadY + 0.008)
        });
    }

    // Close the ribbon with the exact first cross-section to avoid a seam.
    stations.push({ ...stations[0], v: totalLength / 22 });

    for (let i = 0; i < count; i++) {
        const a = stations[i];
        const b = stations[i + 1];

        addRibbonQuad(road, a.left, a.rightEdge, b.left, b.rightEdge, a.v, b.v);
        addRibbonQuad(curbs, a.left, a.curbLeft, b.left, b.curbLeft, a.v, b.v);
        addRibbonQuad(curbs, a.rightEdge, a.curbRight, b.rightEdge, b.curbRight, a.v, b.v);
        addRibbonQuad(edgeLines, a.lineLeftA, a.lineLeftB, b.lineLeftA, b.lineLeftB, a.v, b.v);
        addRibbonQuad(edgeLines, a.lineRightA, a.lineRightB, b.lineRightA, b.lineRightB, a.v, b.v);

        const stripe = Math.floor(i / 5) % 2 === 0 ? colorA : colorB;
        for (let vertex = 0; vertex < 8; vertex++) {
            curbs.colors.push(stripe.r, stripe.g, stripe.b);
        }

        for (const side of [-1, 1]) {
            const offsetA = a.half + a.curb + barrierOffset;
            const offsetB = b.half + b.curb + barrierOffset;
            const baseA = a.center.clone().addScaledVector(a.right, side * offsetA);
            const baseB = b.center.clone().addScaledVector(b.right, side * offsetB);

            const bottomA = baseA.clone(); bottomA.y += 0.025;
            const topA = baseA.clone(); topA.y += barrierHeight;
            const bottomB = baseB.clone(); bottomB.y += 0.025;
            const topB = baseB.clone(); topB.y += barrierHeight;

            let base = barriers.positions.length / 3;
            barriers.positions.push(
                bottomA.x,bottomA.y,bottomA.z, topA.x,topA.y,topA.z,
                bottomB.x,bottomB.y,bottomB.z, topB.x,topB.y,topB.z
            );
            barriers.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);

            const railBottomA = baseA.clone(); railBottomA.y += railHeight;
            const railTopA = baseA.clone(); railTopA.y += railHeight + 0.14;
            const railBottomB = baseB.clone(); railBottomB.y += railHeight;
            const railTopB = baseB.clone(); railTopB.y += railHeight + 0.14;
            base = rails.positions.length / 3;
            rails.positions.push(
                railBottomA.x,railBottomA.y,railBottomA.z, railTopA.x,railTopA.y,railTopA.z,
                railBottomB.x,railBottomB.y,railBottomB.z, railTopB.x,railTopB.y,railTopB.z
            );
            rails.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
    }

    const roadMesh = new THREE.Mesh(
        createRibbonGeometry(road.positions, road.indices, road.uvs),
        new THREE.MeshStandardMaterial({
            map: createAsphaltTexture(trackConfig.theme),
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.02,
            side: THREE.DoubleSide
        })
    );
    roadMesh.receiveShadow = true;
    roadMesh.name = 'track-asphalt';
    trackWorld.add(roadMesh);

    const curbMesh = new THREE.Mesh(
        createRibbonGeometry(curbs.positions, curbs.indices, curbs.uvs, curbs.colors),
        new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.82,
            metalness: 0,
            side: THREE.DoubleSide
        })
    );
    curbMesh.receiveShadow = true;
    curbMesh.name = 'track-curbs';
    trackWorld.add(curbMesh);

    const lineMesh = new THREE.Mesh(
        createRibbonGeometry(edgeLines.positions, edgeLines.indices, edgeLines.uvs),
        new THREE.MeshBasicMaterial({ color: 0xe8edf2, side: THREE.DoubleSide })
    );
    lineMesh.name = 'track-edge-lines';
    trackWorld.add(lineMesh);

    const barrierMesh = new THREE.Mesh(
        createRibbonGeometry(barriers.positions, barriers.indices),
        new THREE.MeshStandardMaterial({
            color: 0x26313d,
            roughness: 0.58,
            metalness: 0.28,
            side: THREE.DoubleSide
        })
    );
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;
    barrierMesh.name = 'track-barriers';
    trackWorld.add(barrierMesh);

    const railMesh = new THREE.Mesh(
        createRibbonGeometry(rails.positions, rails.indices),
        new THREE.MeshStandardMaterial({
            color: trackConfig.railColor,
            emissive: trackConfig.railColor,
            emissiveIntensity: 0.18,
            metalness: 0.72,
            roughness: 0.28,
            side: THREE.DoubleSide
        })
    );
    railMesh.name = 'track-rails';
    trackWorld.add(railMesh);
}

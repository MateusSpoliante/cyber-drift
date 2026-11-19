import * as THREE from 'three';

/**
 * Constrói a pista como faixas contínuas fechadas.
 * Cada superfície usa vértices compartilhados e índices com orientação para cima.
 * As barreiras também são faixas contínuas, evitando blocos sobrepostos nas curvas.
 */
export function buildTrackGeometry({
    trackSamples,
    trackCurve,
    trackWorld,
    trackConfig,
    roadHalfWidth,
    wallOffset,
    createAsphaltTexture
}) {
    const sampleCount = trackSamples.length;
    const gravelWidth = 13.5;
    const curbWidth = 1.65;
    const totalLength = trackCurve.getLength();

    const roadPositions = [];
    const roadUvs = [];
    const roadIndices = [];
    const gravelPositions = [];
    const gravelUvs = [];
    const gravelIndices = [];
    const curbPositions = [];
    const curbColors = [];
    const curbIndices = [];
    const barrierPositions = [];
    const barrierIndices = [];
    const railPositions = [];
    const railIndices = [];

    const curbPalette = [
        new THREE.Color(trackConfig.curbA),
        new THREE.Color(trackConfig.curbB)
    ];

    for (let i = 0; i <= sampleCount; i++) {
        const sample = trackSamples[i % sampleCount];
        const miter = sample.miterScale || 1;
        const halfRoad = roadHalfWidth * miter;
        const outerGravel = (roadHalfWidth + gravelWidth) * miter;
        const outerCurb = (roadHalfWidth + curbWidth) * miter;
        const uvV = (i / sampleCount) * (totalLength / 26);

        const left = sample.pt.clone().addScaledVector(sample.right, -halfRoad);
        const right = sample.pt.clone().addScaledVector(sample.right, halfRoad);
        const gravelLeft = sample.pt.clone().addScaledVector(sample.right, -outerGravel);
        const gravelRight = sample.pt.clone().addScaledVector(sample.right, outerGravel);
        const curbLeft = sample.pt.clone().addScaledVector(sample.right, -outerCurb);
        const curbRight = sample.pt.clone().addScaledVector(sample.right, outerCurb);

        roadPositions.push(left.x, 0.058, left.z, right.x, 0.058, right.z);
        roadUvs.push(0, uvV, 1, uvV);

        gravelPositions.push(
            gravelLeft.x, 0.025, gravelLeft.z,
            left.x, 0.025, left.z,
            right.x, 0.025, right.z,
            gravelRight.x, 0.025, gravelRight.z
        );
        gravelUvs.push(0, uvV, 0.42, uvV, 0.58, uvV, 1, uvV);

        curbPositions.push(
            left.x, 0.075, left.z,
            curbLeft.x, 0.075, curbLeft.z,
            right.x, 0.075, right.z,
            curbRight.x, 0.075, curbRight.z
        );

        const stripeColor = curbPalette[Math.floor(i / 6) % 2];
        for (let k = 0; k < 4; k++) {
            curbColors.push(stripeColor.r, stripeColor.g, stripeColor.b);
        }

        // Continuous barrier wall and a continuous luminous rail on each side.
        const barrierCenter = wallOffset + 0.7;
        for (const side of [-1, 1]) {
            const wallPoint = sample.pt.clone().addScaledVector(sample.right, side * barrierCenter);
            barrierPositions.push(
                wallPoint.x, 0.02, wallPoint.z,
                wallPoint.x, 1.15, wallPoint.z
            );
            const railPoint = sample.pt.clone().addScaledVector(sample.right, side * barrierCenter);
            railPositions.push(
                railPoint.x, 1.16, railPoint.z,
                railPoint.x, 1.29, railPoint.z
            );
        }

        if (i < sampleCount) {
            const roadA = i * 2;
            const roadB = (i + 1) * 2;
            // Counter-clockwise winding when viewed from above: normals point +Y.
            roadIndices.push(
                roadA, roadB, roadA + 1,
                roadA + 1, roadB, roadB + 1
            );

            const g = i * 4;
            const gn = (i + 1) * 4;
            gravelIndices.push(
                g, gn, g + 1,
                g + 1, gn, gn + 1,
                g + 2, gn + 2, g + 3,
                g + 3, gn + 2, gn + 3
            );

            const c = i * 4;
            const cn = (i + 1) * 4;
            curbIndices.push(
                c, cn, c + 1,
                c + 1, cn, cn + 1,
                c + 2, cn + 2, c + 3,
                c + 3, cn + 2, cn + 3
            );

            for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
                // Vertices are interleaved per sample: [side A bottom/top, side B bottom/top].
                const a = i * 4 + sideIndex * 2;
                const next = (i + 1) * 4 + sideIndex * 2;
                barrierIndices.push(a, a + 1, next, a + 1, next + 1, next);
                railIndices.push(a, next, a + 1, a + 1, next, next + 1);
            }
        }
    }

    function createGeometry(positions, indices, uvs = null, colors = null) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        if (uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        return geometry;
    }

    const gravel = new THREE.Mesh(
        createGeometry(gravelPositions, gravelIndices, gravelUvs),
        new THREE.MeshStandardMaterial({
            color: 0x9a8060,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide
        })
    );
    gravel.receiveShadow = true;
    gravel.name = 'track-gravel';
    trackWorld.add(gravel);

    const road = new THREE.Mesh(
        createGeometry(roadPositions, roadIndices, roadUvs),
        new THREE.MeshStandardMaterial({
            map: createAsphaltTexture(trackConfig.theme),
            roughness: 0.76,
            metalness: 0.12,
            side: THREE.DoubleSide
        })
    );
    road.receiveShadow = true;
    road.name = 'track-asphalt';
    trackWorld.add(road);

    const curbs = new THREE.Mesh(
        createGeometry(curbPositions, curbIndices, null, curbColors),
        new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.62,
            side: THREE.DoubleSide
        })
    );
    curbs.receiveShadow = true;
    curbs.name = 'track-curbs';
    trackWorld.add(curbs);

    const barriers = new THREE.Mesh(
        createGeometry(barrierPositions, barrierIndices),
        new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.62,
            metalness: 0.25,
            side: THREE.DoubleSide
        })
    );
    barriers.castShadow = true;
    barriers.receiveShadow = true;
    barriers.name = 'track-barriers';
    trackWorld.add(barriers);

    const rails = new THREE.Mesh(
        createGeometry(railPositions, railIndices),
        new THREE.MeshBasicMaterial({
            color: trackConfig.railColor,
            side: THREE.DoubleSide
        })
    );
    rails.name = 'track-rails';
    trackWorld.add(rails);
}

import * as THREE from 'three';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeGeometry(positions, indices, uvs = null, colors = null) {
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

function makeGravelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#756653';
    ctx.fillRect(0, 0, 256, 256);

    // Fine, deterministic-looking aggregate: avoid large bright pixels/squares.
    let seed = 92821;
    const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    for (let i = 0; i < 5200; i++) {
        const shade = 82 + Math.floor(random() * 52);
        const alpha = 0.12 + random() * 0.24;
        ctx.fillStyle = `rgba(${shade},${shade - 8},${shade - 20},${alpha})`;
        const size = 1 + random() * 1.4;
        ctx.fillRect(random() * 256, random() * 256, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 18);
    texture.anisotropy = 8;
    return texture;
}

/**
 * Builds all circuit surfaces as independent, continuous indexed ribbons.
 * Every station is finite and width-limited before vertices are emitted;
 * the closing station is copied from station zero to prevent seam cracks.
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
    const count = trackSamples.length;
    if (count < 8) throw new Error('Track needs at least 8 valid samples.');

    const gravelWidth = 13.5;
    const curbWidth = 1.65;
    const roadY = 0.058;
    const curbY = 0.078;
    const gravelY = 0.025;
    const totalLength = Math.max(1, trackCurve.getLength());

    const road = { p: [], uv: [], ix: [] };
    const gravel = { p: [], uv: [], ix: [] };
    const curbs = { p: [], uv: [], ix: [], color: [] };
    const edgeLines = { p: [], uv: [], ix: [] };
    const barriers = { p: [], ix: [] };
    const rails = { p: [], ix: [] };
    const curbColors = [
        new THREE.Color(trackConfig.curbA),
        new THREE.Color(trackConfig.curbB)
    ];
    const stations = [];

    for (let i = 0; i < count; i++) {
        const sample = trackSamples[i];
        if (!sample?.pt || !sample?.right ||
            !Number.isFinite(sample.pt.x) || !Number.isFinite(sample.pt.y) ||
            !Number.isFinite(sample.pt.z)) {
            throw new Error(`Invalid track sample at index ${i}.`);
        }
        const right = sample.right.clone();
        right.y = 0;
        if (right.lengthSq() < 1e-8) {
            throw new Error(`Invalid track normal at index ${i}.`);
        }
        right.normalize();
        const widthScale = clamp(Number.isFinite(sample.miterScale) ? sample.miterScale : 1, 0.08, 1);
        const half = roadHalfWidth * widthScale;
        const shoulder = (roadHalfWidth + gravelWidth) * widthScale;
        const curb = (roadHalfWidth + curbWidth) * widthScale;
        const point = sample.pt;
        const v = (i / count) * (totalLength / 22);
        const at = (offset, y) => new THREE.Vector3(
            point.x + right.x * offset,
            point.y + y,
            point.z + right.z * offset
        );
        stations.push({
            point,
            right,
            half,
            shoulder,
            curb,
            y: point.y,
            v,
            left: at(-half, roadY),
            rightEdge: at(half, roadY),
            gravelLeft: at(-shoulder, gravelY),
            gravelRight: at(shoulder, gravelY),
            curbLeft: at(-curb, curbY),
            curbRight: at(curb, curbY),
            lineLeftA: at(-half + 0.48, roadY + 0.006),
            lineLeftB: at(-half + 0.68, roadY + 0.006),
            lineRightA: at(half - 0.68, roadY + 0.006),
            lineRightB: at(half - 0.48, roadY + 0.006)
        });
    }

    // Duplicate the first cross-section exactly: no floating-point seam gap.
    stations.push({ ...stations[0], v: totalLength / 22 });

    const pushPair = (target, a, b, v) => {
        const base = target.p.length / 3;
        target.p.push(a.x, a.y, a.z, b.x, b.y, b.z);
        if (target.uv) target.uv.push(0, v, 1, v);
        return base;
    };
    const pushQuad = (target, a0, a1, b0, b1, v0, v1) => {
        const base = pushPair(target, a0, a1, v0);
        pushPair(target, b0, b1, v1);
        // Consistent winding: top faces point upward.
        target.ix.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    };

    for (let i = 0; i < count; i++) {
        const a = stations[i];
        const b = stations[i + 1];

        pushQuad(road, a.left, a.rightEdge, b.left, b.rightEdge, a.v, b.v);
        pushQuad(gravel, a.gravelLeft, a.left, b.gravelLeft, b.left, a.v, b.v);
        pushQuad(gravel, a.rightEdge, a.gravelRight, b.rightEdge, b.gravelRight, a.v, b.v);

        pushQuad(curbs, a.left, a.curbLeft, b.left, b.curbLeft, a.v, b.v);
        pushQuad(curbs, a.rightEdge, a.curbRight, b.rightEdge, b.curbRight, a.v, b.v);

        // Painted edge lines are real narrow ribbons, not white borders baked
        // into a repeating texture (which used to create broken white artifacts).
        pushQuad(edgeLines, a.lineLeftA, a.lineLeftB, b.lineLeftA, b.lineLeftB, a.v, b.v);
        pushQuad(edgeLines, a.lineRightA, a.lineRightB, b.lineRightA, b.lineRightB, a.v, b.v);

        const stripe = curbColors[Math.floor(i / 6) % 2];
        for (let side = 0; side < 2; side++) {
            for (let vertex = 0; vertex < 4; vertex++) {
                curbs.color.push(stripe.r, stripe.g, stripe.b);
            }
        }

        for (const side of [-1, 1]) {
            const center = Math.max(roadHalfWidth + 2.8, wallOffset * (a.half / roadHalfWidth)) + 0.7;
            const p0 = new THREE.Vector3(a.point.x + a.right.x * side * center, a.y + 0.02, a.point.z + a.right.z * side * center);
            const p1 = new THREE.Vector3(p0.x, a.y + 1.15, p0.z);
            const q0 = new THREE.Vector3(b.point.x + b.right.x * side * center, b.y + 0.02, b.point.z + b.right.z * side * center);
            const q1 = new THREE.Vector3(q0.x, b.y + 1.15, q0.z);
            const base = barriers.p.length / 3;
            barriers.p.push(p0.x,p0.y,p0.z,p1.x,p1.y,p1.z,q0.x,q0.y,q0.z,q1.x,q1.y,q1.z);
            barriers.ix.push(base,base+1,base+2,base+1,base+3,base+2);

            const railBase = rails.p.length / 3;
            const r0 = new THREE.Vector3(p0.x, a.y + 1.19, p0.z);
            const r1 = new THREE.Vector3(p0.x, a.y + 1.31, p0.z);
            const s0 = new THREE.Vector3(q0.x, b.y + 1.19, q0.z);
            const s1 = new THREE.Vector3(q0.x, b.y + 1.31, q0.z);
            rails.p.push(r0.x,r0.y,r0.z,r1.x,r1.y,r1.z,s0.x,s0.y,s0.z,s1.x,s1.y,s1.z);
            rails.ix.push(railBase,railBase+2,railBase+1,railBase+1,railBase+2,railBase+3);
        }
    }

    const gravelTexture = makeGravelTexture();
    const gravelMesh = new THREE.Mesh(
        makeGeometry(gravel.p, gravel.ix, gravel.uv),
        new THREE.MeshStandardMaterial({
            map: gravelTexture,
            color: 0xc5b49a,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide
        })
    );
    gravelMesh.receiveShadow = true;
    gravelMesh.name = 'track-gravel';
    trackWorld.add(gravelMesh);

    const roadMesh = new THREE.Mesh(
        makeGeometry(road.p, road.ix, road.uv),
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
        makeGeometry(curbs.p, curbs.ix, null, curbs.color),
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
        makeGeometry(edgeLines.p, edgeLines.ix),
        new THREE.MeshBasicMaterial({ color: 0xe8edf2, side: THREE.DoubleSide })
    );
    lineMesh.name = 'track-edge-lines';
    trackWorld.add(lineMesh);

    const barrierMesh = new THREE.Mesh(
        makeGeometry(barriers.p, barriers.ix),
        new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.68,
            metalness: 0.18,
            side: THREE.DoubleSide
        })
    );
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;
    barrierMesh.name = 'track-barriers';
    trackWorld.add(barrierMesh);

    const railMesh = new THREE.Mesh(
        makeGeometry(rails.p, rails.ix),
        new THREE.MeshBasicMaterial({ color: trackConfig.railColor, side: THREE.DoubleSide })
    );
    railMesh.name = 'track-rails';
    trackWorld.add(railMesh);
}

import * as THREE from 'three';

export function createSportsCarMesh() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.72, roughness: 0.24 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xFF6500, metalness: 0.58, roughness: 0.26 });
    const cyanAccentMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x080b10, metalness: 0.35, roughness: 0.72 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x07111d, metalness: 0.82, roughness: 0.12 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.92 });
    const wingMat = bodyMat;

    function box(w, h, d, mat, x, y, z, parent = group, bevel = false) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    function taperedPart(points, yBottom, yTop, mat) {
        const verts = [];
        points.forEach(p => verts.push(p[0], yBottom, p[1]));
        points.forEach(p => verts.push(p[0], yTop, p[1]));
        const n = points.length, indices = [];
        for (let i = 1; i < n - 1; i++) {
            indices.push(0, i + 1, i, n, n + i, n + i + 1);
        }
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            indices.push(i, j, n + j, i, n + j, n + i);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }

    // Low, narrow monocoque and long tapered F1 nose (front is +Z).
    taperedPart([
        [-0.58, -1.92], [0.58, -1.92], [0.53, 0.95],
        [0.39, 2.78], [0.23, 3.42], [-0.23, 3.42],
        [-0.39, 2.78], [-0.53, 0.95]
    ], 0.36, 0.76, bodyMat);
    box(0.92, 0.12, 1.05, orangeMat, 0, 0.69, 1.75);
    box(0.48, 0.10, 1.38, orangeMat, 0, 0.78, 2.55);

    // Front wing: main plane, flap and endplates.
    box(3.18, 0.12, 0.48, wingMat, 0, 0.31, 3.12);
    box(2.82, 0.075, 0.26, orangeMat, 0, 0.43, 3.25);
    box(0.10, 0.42, 0.54, orangeMat, -1.52, 0.48, 3.12);
    box(0.10, 0.42, 0.54, orangeMat, 1.52, 0.48, 3.12);
    box(2.38, 0.10, 0.22, darkTrimMat, 0, 0.27, 2.78);

    // Open cockpit, seat and driver protection halo.
    box(0.78, 0.20, 1.12, darkTrimMat, 0, 0.84, -0.12);
    const cockpit = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.48, 0.12, 24), glassMat);
    cockpit.scale.set(1, 1, 1.35);
    cockpit.position.set(0, 0.91, 0.08);
    group.add(cockpit);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.56), darkTrimMat);
    seat.position.set(0, 0.93, -0.58);
    group.add(seat);
    const haloCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.50, 0.98, 0.46),
        new THREE.Vector3(-0.48, 1.43, 0.15),
        new THREE.Vector3(-0.28, 1.55, -0.42),
        new THREE.Vector3(0, 1.58, -0.48),
        new THREE.Vector3(0.28, 1.55, -0.42),
        new THREE.Vector3(0.48, 1.43, 0.15),
        new THREE.Vector3(0.50, 0.98, 0.46)
    ]);
    const halo = new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 32, 0.055, 8, false), orangeMat);
    halo.castShadow = true;
    group.add(halo);
    box(0.10, 0.56, 0.10, orangeMat, 0, 1.23, 0.42);

    // Engine cover, air intake and rear shark fin.
    const engineCover = new THREE.Mesh(new THREE.ConeGeometry(0.47, 1.78, 8), bodyMat);
    engineCover.rotation.x = -Math.PI / 2;
    engineCover.position.set(0, 0.88, -1.25);
    engineCover.scale.set(1, 1, 0.78);
    group.add(engineCover);
    const airIntake = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.075, 8, 18), darkTrimMat);
    airIntake.position.set(0, 1.28, -0.95);
    airIntake.rotation.x = Math.PI / 2;
    group.add(airIntake);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.46, 1.72), orangeMat);
    fin.position.set(0, 1.12, -1.55);
    group.add(fin);

    // Sidepods and aerodynamic floor edges.
    [-1, 1].forEach(side => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 1.72), bodyMat);
        pod.position.set(side * 0.82, 0.60, -0.45);
        pod.rotation.x = -0.035;
        pod.castShadow = true;
        group.add(pod);
        const podStripe = box(0.74, 0.075, 1.30, orangeMat, side * 0.82, 0.83, -0.42);
        podStripe.rotation.x = -0.035;
        box(0.12, 0.18, 2.80, darkTrimMat, side * 0.72, 0.30, -0.12);
        box(0.24, 0.10, 0.50, cyanAccentMat, side * 0.82, 0.57, -1.15);
    });
    box(1.35, 0.10, 0.52, darkTrimMat, 0, 0.38, -1.95);

    // Rear wing with two planes, supports and endplates.
    box(2.48, 0.12, 0.48, wingMat, 0, 1.28, -2.40);
    box(2.28, 0.08, 0.28, orangeMat, 0, 1.48, -2.48);
    box(0.11, 0.58, 0.52, orangeMat, -1.17, 1.14, -2.39);
    box(0.11, 0.58, 0.52, orangeMat, 1.17, 1.14, -2.39);
    box(0.09, 0.68, 0.12, darkTrimMat, -0.48, 0.98, -2.18);
    box(0.09, 0.68, 0.12, darkTrimMat, 0.48, 0.98, -2.18);

    // Floor glow, rain light and rear exhaust.
    const underglow = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 5.3), new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }));
    underglow.rotation.x = Math.PI / 2;
    underglow.position.y = 0.24;
    group.add(underglow);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2638 });
    box(0.18, 0.16, 0.08, tailMat, 0, 0.58, -2.23);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.34, 12), darkTrimMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0.66, -2.42);
    group.add(exhaust);

    const spotLight = new THREE.SpotLight(0xdbeafe, 1.0, 70, Math.PI / 4.2, 0.45, 1.05);
    spotLight.position.set(0, 0.9, 2.8);
    spotLight.target.position.set(0, 0, 18);
    group.add(spotLight);
    group.add(spotLight.target);

    // Twin ERS flames, retained for the existing nitro animation.
    const outerFlameGeo = new THREE.ConeGeometry(0.20, 1.55, 10);
    outerFlameGeo.rotateX(-Math.PI / 2);
    const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const innerFlameGeo = new THREE.ConeGeometry(0.11, 1.0, 8);
    innerFlameGeo.rotateX(-Math.PI / 2);
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xFF6500 });
    const flameL = new THREE.Group();
    flameL.add(new THREE.Mesh(outerFlameGeo, outerFlameMat), new THREE.Mesh(innerFlameGeo, innerFlameMat));
    flameL.position.set(-0.24, 0.54, -2.55);
    flameL.visible = false;
    group.add(flameL);
    const flameR = new THREE.Group();
    flameR.add(new THREE.Mesh(outerFlameGeo, outerFlameMat), new THREE.Mesh(innerFlameGeo, innerFlameMat));
    flameR.position.set(0.24, 0.54, -2.55);
    flameR.visible = false;
    group.add(flameR);

    // Exposed slick tyres: wider rear axle, smaller front axle.
    const tireGeo = new THREE.CylinderGeometry(0.49, 0.49, 0.43, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.45, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xFF6500, metalness: 0.55, roughness: 0.3 });
    const wheelConfigs = [
        { x: -1.35, y: 0.49, z: 1.48, front: true },
        { x: 1.35, y: 0.49, z: 1.48, front: true },
        { x: -1.38, y: 0.49, z: -1.72, front: false },
        { x: 1.38, y: 0.49, z: -1.72, front: false }
    ];
    const steerPivots = [];
    const spinMeshes = [];
    const wheelPivots = [];
    wheelConfigs.forEach(cfg => {
        const pivot = new THREE.Group();
        pivot.position.set(cfg.x, cfg.y, cfg.z);
        const wheelSpin = new THREE.Group();
        const tire = new THREE.Mesh(tireGeo, rubberMat);
        tire.castShadow = true;
        wheelSpin.add(tire);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheelSpin.add(rim);
        // Small aerodynamic wheel-face hub.
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.47, 12), darkTrimMat);
        hub.rotation.z = Math.PI / 2;
        wheelSpin.add(hub);
        pivot.add(wheelSpin);
        group.add(pivot);
        wheelPivots.push(pivot);
        if (cfg.front) steerPivots.push(pivot);
        spinMeshes.push(wheelSpin);
    });

    return { mesh: group, bodyMat, orangeMat, rimMat, underglowMat: underglow.material, tailMat, flameL, flameR, steerPivots, spinMeshes, wheelPivots };
}

/** Atualiza a apresentação do carro sem misturar isso com a simulação de direção. */
export function updateCarVisuals({ playerCar, player, keys, dt, moveStep, spawnSmokeParticle }) {
    playerCar.mesh.position.copy(player.pos);
    playerCar.mesh.rotation.y = player.heading;
    playerCar.mesh.rotation.z = -player.steerInput * 0.055 * Math.min(1, Math.abs(player.speed) / 1.4);
    // Pitch under braking / nitro acceleration
    const targetPitch = player.isNitro ? -0.022 : (keys.s && player.speed > 0.2 ? 0.028 : 0);
    playerCar.mesh.rotation.x += (targetPitch - playerCar.mesh.rotation.x) * Math.min(1, dt * 10);
    
    playerCar.steerPivots.forEach(p => {
        p.rotation.y = player.steerInput * 0.36;
    });
    playerCar.spinMeshes.forEach(w => {
        w.rotation.x += moveStep * 0.65;
    });
    
    playerCar.tailMat.color.setHex(keys.s ? 0xff1e42 : 0x7f1d1d);
    playerCar.flameL.visible = player.isNitro;
    playerCar.flameR.visible = player.isNitro;
    if (player.isNitro) {
        const flicker = 0.85 + Math.random() * 0.65;
        playerCar.flameL.scale.set(1.1, 1.1, flicker);
        playerCar.flameR.scale.set(1.1, 1.1, flicker);
    
        if (Math.random() < 0.5) {
            const exhaustPos = new THREE.Vector3(0, 0.45, -2.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.heading).add(player.pos);
            spawnSmokeParticle(exhaustPos.x, exhaustPos.y, exhaustPos.z, true);
        }
    }
}

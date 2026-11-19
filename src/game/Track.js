import * as THREE from 'three';

/** Cria a linha central e os referenciais usados pela geometria e pela física da pista. */
export function createTrackCenterline({ points, sampleCount = 720 }) {
    if (!Array.isArray(points) || points.length < 4) {
        throw new Error('A pista precisa de pelo menos quatro pontos de controle.');
    }
    if (!Number.isInteger(sampleCount) || sampleCount < 32) {
        throw new Error('sampleCount precisa ser um inteiro maior ou igual a 32.');
    }

    const controlPoints = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');
    const samples = [];

    for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount;
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const baseRight = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        samples.push({ t, pt, tangent, baseRight, right: baseRight.clone(), miterScale: 1 });
    }

    return { curve, samples };
}

import * as THREE from 'three';

/**
 * Creates an evenly sampled, closed centerline for every circuit.
 * Higher arc-length precision prevents uneven frames around tight chicanes.
 */
export function createTrackCenterline({ points, sampleCount = 720 }) {
    if (!Array.isArray(points) || points.length < 4) {
        throw new Error('A pista precisa de pelo menos quatro pontos de controle.');
    }
    if (!Number.isInteger(sampleCount) || sampleCount < 32) {
        throw new Error('sampleCount precisa ser um inteiro maior ou igual a 32.');
    }

    // Remove only exact/near-exact consecutive duplicates. Keep close points
    // that intentionally describe chicanes and hairpins.
    const controlPoints = [];
    for (const point of points) {
        const candidate = new THREE.Vector3(point[0], 0, point[1]);
        const previous = controlPoints[controlPoints.length - 1];
        if (!previous || previous.distanceToSquared(candidate) > 0.04) {
            controlPoints.push(candidate);
        }
    }
    if (controlPoints.length > 2 &&
        controlPoints[0].distanceToSquared(controlPoints[controlPoints.length - 1]) <= 0.04) {
        controlPoints.pop();
    }
    if (controlPoints.length < 4) {
        throw new Error('A pista precisa de pelo menos quatro pontos distintos.');
    }

    const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');
    curve.arcLengthDivisions = Math.max(2400, controlPoints.length * 100);
    curve.updateArcLengths();

    const samples = [];
    for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount;
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const baseRight = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        samples.push({ t, pt, tangent, baseRight, right: baseRight.clone(), miterScale: 1, clearanceScale: 1 });
    }

    return { curve, samples };
}

import * as THREE from 'three';
import { SurfaceType } from '../types/sim';

export interface TrackPoint {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  distance: number;
  progress: number;
}

export class CircuitData {
  public readonly curve: THREE.CatmullRomCurve3;
  public readonly samples: TrackPoint[] = [];
  public readonly totalLength: number;
  public readonly trackHalfWidth = 7.5; // 15m wide F1 grade track
  public readonly kerbWidth = 1.4;
  public readonly runoffWidth = 6.5;

  // Sector boundaries (normalized progress 0..1)
  public readonly sector1End = 0.34;
  public readonly sector2End = 0.68;

  constructor() {
    // Monza-inspired high-speed temple of speed circuit (closed loop, ~2.8 km scaled for exciting 52-58s laps)
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),          // Main Straight Start/Finish
      new THREE.Vector3(0, 0, -260),       // End of Main Straight -> Variante del Rettifilo
      new THREE.Vector3(18, 0, -295),      // Chicane 1 right
      new THREE.Vector3(12, 0, -325),      // Chicane 1 left exit
      new THREE.Vector3(55, 0, -440),      // Curva Grande entry
      new THREE.Vector3(155, 0, -520),     // Curva Grande apex
      new THREE.Vector3(260, 0, -535),     // Approach to Variante della Roggia
      new THREE.Vector3(285, 0, -515),     // Roggia Chicane left
      new THREE.Vector3(315, 0, -525),     // Roggia Chicane right
      new THREE.Vector3(410, 0, -470),     // Lesmo 1 entry
      new THREE.Vector3(455, 0, -395),     // Lesmo 1 exit
      new THREE.Vector3(465, 0, -310),     // Short chute to Lesmo 2
      new THREE.Vector3(430, 0, -230),     // Lesmo 2 apex
      new THREE.Vector3(365, 0, -175),     // Serraglio straight start
      new THREE.Vector3(310, 0, -50),      // Serraglio fast kink
      new THREE.Vector3(270, 0, 75),       // Variante Ascari entry
      new THREE.Vector3(235, 0, 95),       // Ascari left
      new THREE.Vector3(245, 0, 130),      // Ascari right
      new THREE.Vector3(210, 0, 165),      // Ascari exit
      new THREE.Vector3(145, 0, 290),      // Back straight (Rettilineo Opposto)
      new THREE.Vector3(95, 0, 395),       // Parabolica (Curva Alboreto) entry
      new THREE.Vector3(25, 0, 420),       // Parabolica mid-apex
      new THREE.Vector3(-25, 0, 360),      // Parabolica exit
      new THREE.Vector3(-12, 0, 190),      // Main straight approach
    ];

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.45);
    this.totalLength = this.curve.getLength();

    const numSamples = 1200;
    for (let i = 0; i < numSamples; i++) {
      const u = i / numSamples;
      const pos = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      this.samples.push({
        pos,
        tangent,
        right,
        width: this.trackHalfWidth,
        distance: u * this.totalLength,
        progress: u,
      });
    }
  }

  public queryPosition(x: number, z: number): {
    closestPoint: TrackPoint;
    lateralOffset: number;
    distanceFromCenter: number;
    surface: SurfaceType;
    inBounds: boolean;
    hitBarrier: boolean;
  } {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    // Fast coarse search followed by fine local search
    const step = 12;
    for (let i = 0; i < this.samples.length; i += step) {
      const p = this.samples[i].pos;
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestIdx = i;
      }
    }

    const start = (bestIdx - step + this.samples.length) % this.samples.length;
    for (let k = 0; k <= step * 2; k++) {
      const idx = (start + k) % this.samples.length;
      const p = this.samples[idx].pos;
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestIdx = idx;
      }
    }

    const sample = this.samples[bestIdx];
    const relX = x - sample.pos.x;
    const relZ = z - sample.pos.z;
    const lateralOffset = relX * sample.right.x + relZ * sample.right.z;
    const absLat = Math.abs(lateralOffset);

    let surface: SurfaceType = 'asphalt';
    if (absLat <= this.trackHalfWidth) {
      surface = 'asphalt';
    } else if (absLat <= this.trackHalfWidth + this.kerbWidth) {
      surface = 'kerb';
    } else if (absLat <= this.trackHalfWidth + this.kerbWidth + 2.8) {
      surface = 'grass';
    } else {
      surface = 'gravel';
    }

    // Track limits: all 4 wheels beyond kerb (+0.8m margin) invalidates lap
    const inBounds = absLat <= this.trackHalfWidth + this.kerbWidth + 0.85;
    const hitBarrier = absLat >= this.trackHalfWidth + this.kerbWidth + this.runoffWidth;

    return {
      closestPoint: sample,
      lateralOffset,
      distanceFromCenter: absLat,
      surface,
      inBounds,
      hitBarrier,
    };
  }
}

import { CarSetup, CarSnapshot, GhostFrame, QuantizedInput, SurfaceType, TelemetrySample } from '../types/sim';
import { CircuitData } from '../track/monzaTrack';

export const PHYSICS_VERSION = '0.1.0-ts-det';
export const FIXED_HZ = 240;
export const DT = 1 / FIXED_HZ;

// Deterministic math helpers (no non-deterministic host state)
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Pacejka Magic Formula simplified normalized lateral/longitudinal curve
function pacejka(slip: number, B: number, C: number, D: number, E: number): number {
  const bx = B * slip;
  return D * Math.sin(C * Math.atan(bx - E * (bx - Math.atan(bx))));
}

export class SimCore {
  public readonly circuit: CircuitData;
  public setup: CarSetup;

  // Vehicle physical parameters (Formula 1 2026-spec inspired)
  private readonly mass = 798; // kg (including driver)
  private readonly wheelbase = 3.60; // m
  private readonly cgHeight = 0.28; // m
  private readonly frontWeightDist = 0.465;
  private readonly izz = 1180; // yaw moment of inertia kg*m^2
  private readonly wheelRadius = 0.33; // m
  private readonly gearRatios = [-2.95, 0, 3.35, 2.58, 2.08, 1.72, 1.46, 1.26, 1.11, 0.99];
  private readonly finalDrive = 3.35;

  // Dynamic state
  public tick = 0;
  public x = 0;
  public y = 0;
  public z = -15;
  public yaw = 0; // 0 = pointing towards -Z
  public pitch = 0;
  public roll = 0;

  // Body-frame velocities (vx = lateral right, vz = forward)
  public vx = 0;
  public vz = 0;
  public yawRate = 0;

  // Powertrain & controls state
  public rpm = 4200;
  public gear = 1;
  private shiftCooldown = 0;
  private prevGearReq = 0;

  private smoothSteer = 0;
  private smoothThrottle = 0;
  private smoothBrake = 0;

  private latG = 0;
  private longG = 0;
  private slipRatio = 0;
  private slipAngle = 0;
  private wheelSpin = [0, 0, 0, 0];
  private currentSurface: SurfaceType = 'asphalt';
  private absActive = false;
  private tcActive = false;

  // Timing & lap state
  private trackProgress = 0;
  private prevTrackProgress = 0;
  private lapTimeTicks = 0;
  private lapStarted = false;
  private currentSector = 0;
  private sector1Ticks: number | null = null;
  private sector2Ticks: number | null = null;
  private lapValid = true;
  private invalidReason: string | null = null;
  private lapCount = 0;
  private lastLapTicks: number | null = null;
  private bestLapTicks: number | null = null;

  // Recording buffers for current lap
  public currentLapInputs: QuantizedInput[] = [];
  public currentLapGhost: GhostFrame[] = [];
  public currentLapTelemetry: TelemetrySample[] = [];
  public bestLapGhost: GhostFrame[] = [];
  public bestLapSectorSplits: [number, number] | null = null;

  public onLapCompleted?: (record: {
    timeTicks: number;
    sector1Ticks: number;
    sector2Ticks: number;
    sector3Ticks: number;
    valid: boolean;
    ghost: GhostFrame[];
    telemetry: TelemetrySample[];
    inputs: QuantizedInput[];
  }) => void;

  constructor(setup: CarSetup) {
    this.circuit = new CircuitData();
    this.setup = { ...setup };
    this.resetCar();
  }

  public updateSetup(newSetup: CarSetup): void {
    this.setup = { ...newSetup };
  }

  public resetCar(): void {
    const startSample = this.circuit.samples[8];
    this.x = startSample.pos.x;
    this.y = 0;
    this.z = startSample.pos.z;
    this.yaw = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);
    this.pitch = 0;
    this.roll = 0;

    this.vx = 0;
    this.vz = 0;
    this.yawRate = 0;
    this.rpm = 4500;
    this.gear = 1;
    this.shiftCooldown = 0;
    this.smoothSteer = 0;
    this.smoothThrottle = 0;
    this.smoothBrake = 0;
    this.latG = 0;
    this.longG = 0;
    this.wheelSpin = [0, 0, 0, 0];

    this.trackProgress = startSample.progress;
    this.prevTrackProgress = startSample.progress;
    this.lapTimeTicks = 0;
    this.lapStarted = true;
    this.currentSector = 0;
    this.sector1Ticks = null;
    this.sector2Ticks = null;
    this.lapValid = true;
    this.invalidReason = null;

    this.currentLapInputs = [];
    this.currentLapGhost = [];
    this.currentLapTelemetry = [];
  }

  private engineTorqueCurve(rpm: number): number {
    // Hybrid V6 + MGU-K realistic torque curve (Nm)
    const r = clamp(rpm, 3500, 12500);
    if (r < 6000) return lerp(430, 560, (r - 3500) / 2500);
    if (r < 10500) return lerp(560, 625, (r - 6000) / 4500);
    if (r < 11800) return lerp(625, 585, (r - 10500) / 1300);
    return lerp(585, 320, (r - 11800) / 700); // rev limiter drop-off
  }

  public step(rawInput: { steer: number; throttle: number; brake: number; gearReq: number }): void {
    this.tick++;

    // 1. Quantize inputs (for deterministic replay log)
    const qInput: QuantizedInput = {
      tick: this.tick,
      steer: Math.round(clamp(rawInput.steer, -1, 1) * 32767),
      throttle: Math.round(clamp(rawInput.throttle, 0, 1) * 255),
      brake: Math.round(clamp(rawInput.brake, 0, 1) * 255),
      gearReq: clamp(Math.round(rawInput.gearReq), -1, 1),
    };

    if (this.lapStarted) {
      this.currentLapInputs.push(qInput);
    }

    const targetSteer = qInput.steer / 32767;
    const targetThrottle = qInput.throttle / 255;
    const targetBrake = qInput.brake / 255;

    // Input actuator response smoothing
    this.smoothSteer = lerp(this.smoothSteer, targetSteer, 28 * DT);
    this.smoothThrottle = lerp(this.smoothThrottle, targetThrottle, 36 * DT);
    this.smoothBrake = lerp(this.smoothBrake, targetBrake, 42 * DT);

    // 2. Query surface & track limits
    const trackInfo = this.circuit.queryPosition(this.x, this.z);
    this.currentSurface = trackInfo.surface;

    if (!trackInfo.inBounds && this.lapValid) {
      this.lapValid = false;
      this.invalidReason = 'OFF TRACK (TRACK LIMITS)';
    }

    // Surface friction & rolling resistance multipliers
    let surfaceGrip = 1.0;
    let rollingDrag = 140;
    if (this.currentSurface === 'kerb') {
      surfaceGrip = 0.96;
      rollingDrag = 180;
    } else if (this.currentSurface === 'grass') {
      surfaceGrip = 0.62;
      rollingDrag = 680;
    } else if (this.currentSurface === 'gravel') {
      surfaceGrip = 0.52;
      rollingDrag = 1250;
    }

    // Tire pressure factor (optimal ~21.5 PSI)
    const pressureDelta = Math.abs(this.setup.tirePressure - 21.5);
    const tirePressureGrip = 1.0 - pressureDelta * 0.012;

    // 3. Aerodynamics (downforce & drag proportional to v^2)
    const speedSq = this.vz * this.vz + this.vx * this.vx;
    const speed = Math.sqrt(speedSq);
    const wingSum = this.setup.frontWing + this.setup.rearWing; // 2..30
    const cl = 2.55 + wingSum * 0.068; // Downforce coefficient
    const cd = 0.78 + wingSum * 0.015; // Drag coefficient
    const airDensity = 1.225;
    const frontalArea = 1.48;

    const downforce = 0.5 * airDensity * cl * frontalArea * speedSq;
    const aeroDrag = 0.5 * airDensity * cd * frontalArea * speedSq;

    // Aero balance shift
    const frontAeroShare = 0.36 + (this.setup.frontWing / Math.max(1, wingSum)) * 0.16;
    const downforceFront = downforce * frontAeroShare;
    const downforceRear = downforce * (1 - frontAeroShare);

    // 4. Dynamic Weight Transfer
    const staticFrontLoad = this.mass * 9.81 * this.frontWeightDist;
    const staticRearLoad = this.mass * 9.81 * (1 - this.frontWeightDist);
    const longWeightTransfer = (this.mass * this.longG * 9.81 * this.cgHeight) / this.wheelbase;

    const normalLoadFront = Math.max(400, staticFrontLoad + downforceFront - longWeightTransfer);
    const normalLoadRear = Math.max(400, staticRearLoad + downforceRear + longWeightTransfer);

    // 5. Gearbox & Engine RPM
    if (this.shiftCooldown > 0) {
      this.shiftCooldown -= DT;
    }

    const gearRatio = this.gearRatios[this.gear + 1] || 0;
    const totalRatio = Math.abs(gearRatio) * this.finalDrive;

    if (this.setup.autoGearbox) {
      if (this.shiftCooldown <= 0) {
        if (this.gear >= 1 && this.gear < 8 && this.rpm > 11350 && this.smoothThrottle > 0.5) {
          this.gear++;
          this.shiftCooldown = 0.09;
        } else if (this.gear > 1 && this.rpm < 6400) {
          this.gear--;
          this.shiftCooldown = 0.09;
        }
      }
    } else {
      if (qInput.gearReq !== 0 && qInput.gearReq !== this.prevGearReq && this.shiftCooldown <= 0) {
        const nextGear = clamp(this.gear + qInput.gearReq, -1, 8);
        if (nextGear !== 0 && nextGear !== this.gear) {
          this.gear = nextGear;
          this.shiftCooldown = 0.075;
        }
      }
    }
    this.prevGearReq = qInput.gearReq;

    const wheelAngVel = Math.max(0, this.vz) / this.wheelRadius;
    const coupledRpm = (wheelAngVel * totalRatio * 60) / (2 * Math.PI);
    const idleRpm = 4200;
    const targetRpm = Math.max(idleRpm + this.smoothThrottle * 3200, coupledRpm);
    this.rpm = clamp(lerp(this.rpm, targetRpm, 25 * DT), 3800, 12300);

    // 6. Longitudinal Forces (Drive + Brake + Drag)
    let driveForce = 0;
    this.tcActive = false;
    if (this.gear !== 0 && this.shiftCooldown <= 0.02) {
      const torque = this.engineTorqueCurve(this.rpm) * this.smoothThrottle;
      const dir = this.gear > 0 ? 1 : -1;
      driveForce = ((torque * totalRatio * 0.92) / this.wheelRadius) * dir;
    }

    // Peak longitudinal tire capacity on rear axle
    const muBase = 1.72 * surfaceGrip * tirePressureGrip;
    const maxRearTraction = normalLoadRear * muBase;

    if (Math.abs(driveForce) > maxRearTraction) {
      if (this.setup.tractionControl) {
        driveForce = Math.sign(driveForce) * maxRearTraction * 0.96;
        this.tcActive = true;
      } else {
        // Wheelspin reduces effective forward grip
        this.slipRatio = (Math.abs(driveForce) - maxRearTraction) / maxRearTraction;
        driveForce = Math.sign(driveForce) * maxRearTraction * 0.84;
      }
    } else {
      this.slipRatio = 0;
    }

    // Braking force with brake bias & optional ABS
    const maxBrakeForce = 24500; // N (~3.1G + aero)
    let totalBrake = this.smoothBrake * maxBrakeForce;
    const biasFront = this.setup.brakeBias / 100;
    let brakeFront = totalBrake * biasFront;
    let brakeRear = totalBrake * (1 - biasFront);

    const maxFrontBrakeGrip = normalLoadFront * muBase;
    const maxRearBrakeGrip = normalLoadRear * muBase;
    this.absActive = false;

    if (brakeFront > maxFrontBrakeGrip) {
      if (this.setup.abs) {
        brakeFront = maxFrontBrakeGrip * 0.95;
        this.absActive = true;
      } else {
        brakeFront = maxFrontBrakeGrip * 0.78;
      }
    }
    if (brakeRear > maxRearBrakeGrip) {
      if (this.setup.abs) {
        brakeRear = maxRearBrakeGrip * 0.95;
        this.absActive = true;
      } else {
        brakeRear = maxRearBrakeGrip * 0.78;
      }
    }

    const forwardSign = this.vz >= 0 ? 1 : -1;
    const brakingLongForce = this.vz > 0.15 ? -(brakeFront + brakeRear) : this.vz < -0.15 ? (brakeFront + brakeRear) : 0;
    const resistanceForce = -forwardSign * (aeroDrag + rollingDrag * (speed > 0.05 ? 1 : 0));

    const netLongForce = driveForce + brakingLongForce + resistanceForce;

    // 7. Lateral Dynamics (Bicycle + Pacejka Cornering Stiffness + Friction Ellipse)
    // Speed-sensitive steering lock (24 deg at slow hairpins, tighter at 300+ km/h)
    const maxSteerRad = lerp(0.42, 0.13, clamp(speed / 85, 0, 1));
    const steerAngle = this.smoothSteer * maxSteerRad;

    const a = this.wheelbase * (1 - this.frontWeightDist); // CG to front axle
    const b = this.wheelbase * this.frontWeightDist;       // CG to rear axle

    let fyFront = 0;
    let fyRear = 0;

    if (speed > 0.8) {
      const vzSafe = Math.max(1.5, Math.abs(this.vz));
      const alphaFront = Math.atan2(this.vx + a * this.yawRate, vzSafe) - steerAngle * Math.sign(this.vz || 1);
      const alphaRear = Math.atan2(this.vx - b * this.yawRate, vzSafe);
      this.slipAngle = (alphaFront + alphaRear) * 0.5;

      // Friction ellipse reduction when braking/accelerating hard
      const frontUsedLong = clamp(brakeFront / Math.max(1, maxFrontBrakeGrip), 0, 0.95);
      const rearUsedLong = clamp((Math.abs(driveForce) + brakeRear) / Math.max(1, maxRearBrakeGrip), 0, 0.95);

      const availLatFront = Math.sqrt(Math.max(0.08, 1 - frontUsedLong * frontUsedLong));
      const availLatRear = Math.sqrt(Math.max(0.08, 1 - rearUsedLong * rearUsedLong));

      // Diff lock affects rear yaw damping under throttle
      const diffStability = 1.0 + (this.setup.diffOnThrottle - 70) * 0.0025 * this.smoothThrottle;

      fyFront = -pacejka(alphaFront, 11.5, 1.45, normalLoadFront * muBase * availLatFront, 0.35);
      fyRear = -pacejka(alphaRear, 12.2, 1.48, normalLoadRear * muBase * availLatRear * diffStability, 0.35);
    } else {
      this.slipAngle = 0;
      this.vx *= 0.85;
      this.yawRate *= 0.85;
    }

    const netLatForce = fyFront * Math.cos(steerAngle) + fyRear;
    const yawTorque = a * fyFront * Math.cos(steerAngle) - b * fyRear;

    // 8. Semi-Implicit Euler Integration
    const az = netLongForce / this.mass + this.vx * this.yawRate;
    const ax = netLatForce / this.mass - this.vz * this.yawRate;
    const yawAccel = yawTorque / this.izz;

    this.vz += az * DT;
    this.vx += ax * DT;
    this.yawRate += yawAccel * DT;

    // Natural damping at near-zero speed
    if (Math.abs(this.vz) < 0.04 && this.smoothThrottle < 0.02 && this.smoothBrake > 0.1) {
      this.vz = 0;
      this.vx = 0;
      this.yawRate = 0;
    }

    this.yaw += this.yawRate * DT;

    // Transform body velocity to world coordinates (yaw = 0 -> -Z forward, +X right)
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const worldVx = this.vx * cosY - this.vz * sinY;
    const worldVz = -this.vx * sinY - this.vz * cosY;

    this.x += worldVx * DT;
    this.z += worldVz * DT;

    // Barrier collision response (soft elastic wall + lap invalidation)
    const postCheck = this.circuit.queryPosition(this.x, this.z);
    if (postCheck.hitBarrier) {
      const sign = postCheck.lateralOffset >= 0 ? 1 : -1;
      const maxOffset = this.circuit.trackHalfWidth + this.circuit.kerbWidth + this.circuit.runoffWidth - 0.5;
      this.x = postCheck.closestPoint.pos.x + postCheck.closestPoint.right.x * maxOffset * sign;
      this.z = postCheck.closestPoint.pos.z + postCheck.closestPoint.right.z * maxOffset * sign;
      this.vz *= 0.65;
      this.vx *= -0.25;
      if (this.lapValid) {
        this.lapValid = false;
        this.invalidReason = 'WALL CONTACT';
      }
    }

    // Visual suspension pitch/roll & G-forces
    this.longG = clamp(az / 9.81, -5.5, 3.0);
    this.latG = clamp(ax / 9.81, -5.5, 5.5);
    this.roll = lerp(this.roll, clamp(-this.latG * 0.016, -0.06, 0.06), 14 * DT);
    this.pitch = lerp(this.pitch, clamp(this.longG * 0.012, -0.04, 0.04), 14 * DT);

    const baseSpin = (this.vz / this.wheelRadius) * DT;
    this.wheelSpin[0] += baseSpin;
    this.wheelSpin[1] += baseSpin;
    this.wheelSpin[2] += baseSpin * (1 + this.slipRatio * 0.5);
    this.wheelSpin[3] += baseSpin * (1 + this.slipRatio * 0.5);

    // 9. Timing, Sectors & Ghost Sampling
    this.prevTrackProgress = this.trackProgress;
    this.trackProgress = postCheck.closestPoint.progress;

    if (this.lapStarted) {
      this.lapTimeTicks++;

      // Sector 1 split
      if (this.currentSector === 0 && this.trackProgress >= this.circuit.sector1End && this.prevTrackProgress < this.circuit.sector1End) {
        this.sector1Ticks = this.lapTimeTicks;
        this.currentSector = 1;
      }
      // Sector 2 split
      if (this.currentSector === 1 && this.trackProgress >= this.circuit.sector2End && this.prevTrackProgress < this.circuit.sector2End) {
        this.sector2Ticks = this.lapTimeTicks - (this.sector1Ticks || 0);
        this.currentSector = 2;
      }

      // Sample Ghost at ~30 Hz (every 8 ticks)
      if (this.lapTimeTicks % 8 === 0) {
        this.currentLapGhost.push({
          tick: this.lapTimeTicks,
          x: this.x,
          y: this.y,
          z: this.z,
          yaw: this.yaw,
          roll: this.roll,
          steerAngle,
        });
      }

      // Sample Telemetry at 20 Hz (every 12 ticks)
      if (this.lapTimeTicks % 12 === 0) {
        this.currentLapTelemetry.push({
          tick: this.lapTimeTicks,
          timeSec: this.lapTimeTicks / FIXED_HZ,
          speedKmh: Math.abs(this.vz) * 3.6,
          rpm: Math.round(this.rpm),
          gear: this.gear,
          throttle: Math.round(this.smoothThrottle * 100),
          brake: Math.round(this.smoothBrake * 100),
          steer: Math.round(this.smoothSteer * 100),
          latG: Number(this.latG.toFixed(2)),
          longG: Number(this.longG.toFixed(2)),
          progress: Number(this.trackProgress.toFixed(4)),
        });
      }

      // Finish line crossing (progress wraps from >0.92 to <0.08)
      if (this.prevTrackProgress > 0.92 && this.trackProgress < 0.08 && this.lapTimeTicks > FIXED_HZ * 10) {
        const totalTicks = this.lapTimeTicks;
        const s1 = this.sector1Ticks ?? Math.round(totalTicks * 0.34);
        const s2 = this.sector2Ticks ?? Math.round(totalTicks * 0.34);
        const s3 = Math.max(1, totalTicks - s1 - s2);

        this.lapCount++;
        this.lastLapTicks = totalTicks;

        if (this.lapValid) {
          if (this.bestLapTicks === null || totalTicks < this.bestLapTicks) {
            this.bestLapTicks = totalTicks;
            this.bestLapGhost = [...this.currentLapGhost];
            this.bestLapSectorSplits = [s1, s1 + s2];
          }
        }

        if (this.onLapCompleted) {
          this.onLapCompleted({
            timeTicks: totalTicks,
            sector1Ticks: s1,
            sector2Ticks: s2,
            sector3Ticks: s3,
            valid: this.lapValid,
            ghost: [...this.currentLapGhost],
            telemetry: [...this.currentLapTelemetry],
            inputs: [...this.currentLapInputs],
          });
        }

        // Start next lap seamlessly
        this.lapTimeTicks = 0;
        this.currentSector = 0;
        this.sector1Ticks = null;
        this.sector2Ticks = null;
        this.lapValid = true;
        this.invalidReason = null;
        this.currentLapInputs = [];
        this.currentLapGhost = [];
        this.currentLapTelemetry = [];
      }
    }
  }

  public getSnapshot(): CarSnapshot {
    let deltaTicks: number | null = null;
    if (this.bestLapGhost.length > 0 && this.lapTimeTicks > 0) {
      // Find ghost frame at matching track progress
      const ghostIdx = Math.min(
        this.bestLapGhost.length - 1,
        Math.floor(this.trackProgress * this.bestLapGhost.length)
      );
      const refGhost = this.bestLapGhost[ghostIdx];
      if (refGhost) {
        deltaTicks = this.lapTimeTicks - refGhost.tick;
      }
    }

    return {
      tick: this.tick,
      x: this.x,
      y: this.y,
      z: this.z,
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
      vx: this.vx,
      vz: this.vz,
      speedKmh: Math.abs(this.vz) * 3.6,
      rpm: this.rpm,
      gear: this.gear,
      steerAngle: this.smoothSteer,
      throttle: this.smoothThrottle,
      brake: this.smoothBrake,
      latG: this.latG,
      longG: this.longG,
      slipRatio: this.slipRatio,
      slipAngle: this.slipAngle,
      wheelSpinFL: this.wheelSpin[0],
      wheelSpinFR: this.wheelSpin[1],
      wheelSpinRL: this.wheelSpin[2],
      wheelSpinRR: this.wheelSpin[3],
      surface: this.currentSurface,
      trackProgress: this.trackProgress,
      lapTimeTicks: this.lapTimeTicks,
      currentSector: this.currentSector,
      sector1Ticks: this.sector1Ticks,
      sector2Ticks: this.sector2Ticks,
      lapValid: this.lapValid,
      invalidReason: this.invalidReason,
      lapCount: this.lapCount,
      lastLapTicks: this.lastLapTicks,
      bestLapTicks: this.bestLapTicks,
      deltaTicks,
      absActive: this.absActive,
      tcActive: this.tcActive,
    };
  }

  public getInterpolatedGhost(lapTicks: number): GhostFrame | null {
    if (this.bestLapGhost.length < 2) return null;
    const idx = Math.floor(lapTicks / 8);
    if (idx < 0 || idx >= this.bestLapGhost.length - 1) return null;
    const f0 = this.bestLapGhost[idx];
    const f1 = this.bestLapGhost[idx + 1];
    const alpha = (lapTicks - f0.tick) / Math.max(1, f1.tick - f0.tick);
    return {
      tick: lapTicks,
      x: lerp(f0.x, f1.x, alpha),
      y: lerp(f0.y, f1.y, alpha),
      z: lerp(f0.z, f1.z, alpha),
      yaw: lerp(f0.yaw, f1.yaw, alpha),
      roll: lerp(f0.roll, f1.roll, alpha),
      steerAngle: lerp(f0.steerAngle, f1.steerAngle, alpha),
    };
  }
}

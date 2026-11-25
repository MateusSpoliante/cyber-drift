export type CameraMode = 'tcam' | 'cockpit' | 'chase';

export type SurfaceType = 'asphalt' | 'kerb' | 'grass' | 'gravel';

export interface CarSetup {
  frontWing: number;      // 1 to 15 (downforce/drag)
  rearWing: number;       // 1 to 15
  brakeBias: number;      // 50 to 65 (% front)
  diffOnThrottle: number; // 50 to 100 (%)
  tirePressure: number;   // 19.0 to 24.0 (PSI)
  autoGearbox: boolean;
  tractionControl: boolean;
  abs: boolean;
}

export interface QuantizedInput {
  tick: number;
  steer: number;    // -32767 to 32767
  throttle: number; // 0 to 255
  brake: number;    // 0 to 255
  gearReq: number;  // -1 down, 0 none, 1 up
}

export interface CarSnapshot {
  tick: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  vx: number;
  vz: number;
  speedKmh: number;
  rpm: number;
  gear: number; // -1 = R, 0 = N, 1..8
  steerAngle: number;
  throttle: number;
  brake: number;
  latG: number;
  longG: number;
  slipRatio: number;
  slipAngle: number;
  wheelSpinFL: number;
  wheelSpinFR: number;
  wheelSpinRL: number;
  wheelSpinRR: number;
  surface: SurfaceType;
  trackProgress: number; // 0.0 to 1.0
  lapTimeTicks: number;
  currentSector: number; // 0, 1, 2
  sector1Ticks: number | null;
  sector2Ticks: number | null;
  lapValid: boolean;
  invalidReason: string | null;
  lapCount: number;
  lastLapTicks: number | null;
  bestLapTicks: number | null;
  deltaTicks: number | null;
  absActive: boolean;
  tcActive: boolean;
}

export interface GhostFrame {
  tick: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
  steerAngle: number;
}

export interface TelemetrySample {
  tick: number;
  timeSec: number;
  speedKmh: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steer: number;
  latG: number;
  longG: number;
  progress: number;
}

export interface LapRecord {
  id: string;
  driver: string;
  timeTicks: number;
  timeFormatted: string;
  sector1Formatted: string;
  sector2Formatted: string;
  sector3Formatted: string;
  assists: string;
  date: string;
  physicsVersion: string;
  ghost: GhostFrame[];
  telemetry: TelemetrySample[];
  inputsCount: number;
}

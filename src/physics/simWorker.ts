import { CarSetup, GhostFrame, QuantizedInput, TelemetrySample } from '../types/sim';
import { DT, SimCore } from './simCore';

let sim: SimCore | null = null;
let running = false;
let lastTime = 0;
let accumulator = 0;

const defaultSetup: CarSetup = {
  frontWing: 8,
  rearWing: 8,
  brakeBias: 57,
  diffOnThrottle: 70,
  tirePressure: 21.5,
  autoGearbox: true,
  tractionControl: true,
  abs: true,
};

let latestInput = {
  steer: 0,
  throttle: 0,
  brake: 0,
  gearReq: 0,
};

function initSim(setup: CarSetup) {
  sim = new SimCore(setup);
  sim.onLapCompleted = (record: {
    timeTicks: number;
    sector1Ticks: number;
    sector2Ticks: number;
    sector3Ticks: number;
    valid: boolean;
    ghost: GhostFrame[];
    telemetry: TelemetrySample[];
    inputs: QuantizedInput[];
  }) => {
    self.postMessage({
      type: 'LAP_COMPLETED',
      payload: record,
    });
  };
}

function loop() {
  if (!running || !sim) return;

  const now = performance.now();
  const frameDt = Math.min((now - lastTime) / 1000, 0.05); // clamp max step to prevent spiral of death
  lastTime = now;
  accumulator += frameDt;

  let steps = 0;
  const maxSteps = 16;
  while (accumulator >= DT && steps < maxSteps) {
    sim.step(latestInput);
    accumulator -= DT;
    steps++;
  }

  const snapshot = sim.getSnapshot();
  const ghost = sim.getInterpolatedGhost(snapshot.lapTimeTicks);

  self.postMessage({
    type: 'SNAPSHOT',
    snapshot,
    ghost,
  });

  setTimeout(loop, 4); // ~240Hz scheduling cadence
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case 'INIT':
      initSim(msg.setup || defaultSetup);
      running = true;
      lastTime = performance.now();
      accumulator = 0;
      loop();
      break;
    case 'INPUT':
      latestInput = msg.input;
      break;
    case 'UPDATE_SETUP':
      if (sim) sim.updateSetup(msg.setup);
      break;
    case 'RESET':
      if (sim) {
        sim.resetCar();
        accumulator = 0;
      }
      break;
    case 'PAUSE':
      running = false;
      break;
    case 'RESUME':
      if (!running) {
        running = true;
        lastTime = performance.now();
        loop();
      }
      break;
  }
};

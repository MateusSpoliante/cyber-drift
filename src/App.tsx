import React, { useEffect, useRef, useState } from 'react';
import { Play, Flag, Cpu, Gauge } from 'lucide-react';
import { CircuitData } from './track/monzaTrack';
import { FormulaScene } from './render/formulaScene';
import { InputManager } from './input/inputManager';
import { CameraMode, CarSetup, CarSnapshot, GhostFrame, LapRecord } from './types/sim';
import { HudOverlay } from './components/HudOverlay';
import { LeaderboardModal } from './components/LeaderboardModal';
import { formatLapTicks } from './telemetry/formatters';
import { PHYSICS_VERSION } from './physics/simCore';

const STORAGE_KEY = 'apex01_monza_leaderboard_v1';

const DEFAULT_SETUP: CarSetup = {
  frontWing: 8,
  rearWing: 8,
  brakeBias: 57,
  diffOnThrottle: 70,
  tirePressure: 21.5,
  autoGearbox: true,
  tractionControl: true,
  abs: true,
};

export function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const sceneRef = useRef<FormulaScene | null>(null);
  const inputRef = useRef<InputManager | null>(null);

  const latestSnapshotRef = useRef<CarSnapshot | null>(null);
  const latestGhostRef = useRef<GhostFrame | null>(null);

  const [started, setStarted] = useState(false);
  const [driverName, setDriverName] = useState('DRIVER #01');
  const [snapshot, setSnapshot] = useState<CarSnapshot | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('tcam');
  const [setup, setSetup] = useState<CarSetup>(DEFAULT_SETUP);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lapBanner, setLapBanner] = useState<{ text: string; valid: boolean } | null>(null);

  const [records, setRecords] = useState<LapRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const setupRef = useRef(setup);
  setupRef.current = setup;
  const driverRef = useRef(driverName);
  driverRef.current = driverName;

  useEffect(() => {
    if (!started || !canvasContainerRef.current) return;

    const circuit = new CircuitData();
    const scene = new FormulaScene(canvasContainerRef.current, circuit);
    sceneRef.current = scene;

    const input = new InputManager();
    input.onCameraToggle = () => {
      const modes: CameraMode[] = ['tcam', 'cockpit', 'chase'];
      const next = modes[(modes.indexOf(scene.getCameraMode()) + 1) % modes.length];
      scene.setCameraMode(next);
      setCameraMode(next);
    };
    input.onResetLap = () => {
      workerRef.current?.postMessage({ type: 'RESET' });
    };
    inputRef.current = input;

    const worker = new Worker(new URL('./physics/simWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'SNAPSHOT') {
        latestSnapshotRef.current = msg.snapshot;
        latestGhostRef.current = msg.ghost;
      } else if (msg.type === 'LAP_COMPLETED') {
        const p = msg.payload;
        const formatted = formatLapTicks(p.timeTicks);
        setLapBanner({
          text: p.valid
            ? `LAP COMPLETED: ${formatted}`
            : `LAP INVALIDATED (${formatted})`,
          valid: p.valid,
        });
        setTimeout(() => setLapBanner(null), 4000);

        if (p.valid) {
          const s = setupRef.current;
          const assistsList = [
            s.autoGearbox ? 'AUTO' : 'MAN',
            s.tractionControl ? 'TC' : null,
            s.abs ? 'ABS' : null,
          ]
            .filter(Boolean)
            .join('+');

          const newRecord: LapRecord = {
            id: crypto.randomUUID(),
            driver: driverRef.current || 'DRIVER #01',
            timeTicks: p.timeTicks,
            timeFormatted: formatted,
            sector1Formatted: formatLapTicks(p.sector1Ticks),
            sector2Formatted: formatLapTicks(p.sector2Ticks),
            sector3Formatted: formatLapTicks(p.sector3Ticks),
            assists: assistsList || 'PRO (NO ASSISTS)',
            date: new Date().toISOString(),
            physicsVersion: PHYSICS_VERSION,
            ghost: p.ghost,
            telemetry: p.telemetry,
            inputsCount: p.inputs.length,
          };

          setRecords((prev) => {
            const updated = [...prev, newRecord].sort((a, b) => a.timeTicks - b.timeTicks).slice(0, 25);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // ignore storage quota
            }
            return updated;
          });
        }
      }
    };

    worker.postMessage({ type: 'INIT', setup: setupRef.current });

    let animId = 0;
    let lastFrame = performance.now();
    let hudSyncCounter = 0;

    const renderLoop = (now: number) => {
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;

      const ctrl = input.poll(dt);
      worker.postMessage({ type: 'INPUT', input: ctrl });

      if (latestSnapshotRef.current) {
        scene.render(latestSnapshotRef.current, latestGhostRef.current);
        hudSyncCounter++;
        if (hudSyncCounter % 2 === 0) {
          setSnapshot(latestSnapshotRef.current);
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      worker.terminate();
      input.destroy();
      scene.destroy();
    };
  }, [started]);

  const handleToggleCamera = () => {
    if (!sceneRef.current) return;
    const modes: CameraMode[] = ['tcam', 'cockpit', 'chase'];
    const next = modes[(modes.indexOf(sceneRef.current.getCameraMode()) + 1) % modes.length];
    sceneRef.current.setCameraMode(next);
    setCameraMode(next);
  };

  if (!started) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/30 p-6 font-mono">
        <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-red-500">
            <Flag className="h-4 w-4" />
            FORMULA RACING SIMULATOR // MVP v0.1
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            APEX-01 <span className="text-red-500">MONZA</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Jogo de corrida estilo arcade: acelere, freie e faça curvas com controles simples. Supere seu melhor tempo em Monza.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5">
              <Cpu className="h-4 w-4 text-sky-400 mb-1.5" />
              <div className="font-bold text-zinc-200">CONTROLES SIMPLES</div>
              <div className="text-zinc-500 mt-0.5">Acelere e faça curvas</div>
            </div>
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5">
              <Gauge className="h-4 w-4 text-emerald-400 mb-1.5" />
              <div className="font-bold text-zinc-200">DIREÇÃO ARCADE</div>
              <div className="text-zinc-500 mt-0.5">Carro mais fácil de controlar</div>
            </div>
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5">
              <Flag className="h-4 w-4 text-amber-400 mb-1.5" />
              <div className="font-bold text-zinc-200">Ghost & Telemetry</div>
              <div className="text-zinc-500 mt-0.5">Comparação de setores e JSON</div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">
              PILOT / DRIVER TAG
            </label>
            <input
              type="text"
              maxLength={18}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white focus:border-red-500 focus:outline-none"
              placeholder="SENNA #12"
            />
          </div>

          <button
            onClick={() => setStarted(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-black tracking-wider text-white shadow-lg shadow-red-600/20 hover:bg-red-500 transition"
          >
            <Play className="h-4 w-4 fill-current" />
            ENTER TRACK (MONZA GP)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <div ref={canvasContainerRef} className="h-full w-full" />

      {lapBanner && (
        <div
          className={`fixed top-28 left-1/2 -translate-x-1/2 z-40 rounded-full border px-6 py-2 font-mono text-sm font-bold shadow-xl backdrop-blur-md ${
            lapBanner.valid
              ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
              : 'border-rose-500/50 bg-rose-950/90 text-rose-300'
          }`}
        >
          {lapBanner.text}
        </div>
      )}

      <HudOverlay
        snapshot={snapshot}
        cameraMode={cameraMode}
        onToggleCamera={handleToggleCamera}
        onResetLap={() => workerRef.current?.postMessage({ type: 'RESET' })}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
      />

      {showLeaderboard && (
        <LeaderboardModal
          records={records}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}

export default App;

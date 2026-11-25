import React from 'react';
import { Camera, RotateCcw, Trophy, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import { CameraMode, CarSnapshot } from '../types/sim';
import { formatDeltaTicks, formatLapTicks } from '../telemetry/formatters';

interface HudOverlayProps {
  snapshot: CarSnapshot | null;
  cameraMode: CameraMode;
  onToggleCamera: () => void;
  onResetLap: () => void;
  onOpenLeaderboard: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  snapshot,
  cameraMode,
  onToggleCamera,
  onResetLap,
  onOpenLeaderboard,
}) => {
  if (!snapshot) return null;

  const rpmRatio = Math.min(1, Math.max(0, (snapshot.rpm - 4000) / 8200));
  const ledCount = 15;
  const activeLeds = Math.round(rpmRatio * ledCount);

  const gearLabel =
    snapshot.gear === -1 ? 'R' : snapshot.gear === 0 ? 'N' : String(snapshot.gear);

  const deltaColor =
    snapshot.deltaTicks === null
      ? 'text-zinc-400'
      : snapshot.deltaTicks <= 0
      ? 'text-emerald-400'
      : 'text-rose-400';

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-5 font-mono">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-4">
        {/* Top Left: Circuit & Lap Status */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-zinc-800/90 bg-zinc-950/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider text-zinc-200">
              MONZA GP // TIME TRIAL
            </span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              240Hz DET
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800/80 pt-2 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500">CURRENT LAP</div>
              <div
                className={`text-base font-bold ${
                  snapshot.lapValid ? 'text-white' : 'text-rose-500 line-through'
                }`}
              >
                {formatLapTicks(snapshot.lapTimeTicks)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">DELTA</div>
              <div className={`text-base font-bold ${deltaColor}`}>
                {formatDeltaTicks(snapshot.deltaTicks)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">BEST VALID</div>
              <div className="text-base font-bold text-purple-400">
                {formatLapTicks(snapshot.bestLapTicks)}
              </div>
            </div>
          </div>

          {/* Sector Splits */}
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`rounded px-2 py-0.5 ${
                snapshot.currentSector === 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              S1: {formatLapTicks(snapshot.sector1Ticks)}
            </span>
            <span
              className={`rounded px-2 py-0.5 ${
                snapshot.currentSector === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              S2: {formatLapTicks(snapshot.sector2Ticks)}
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px]">
              {snapshot.lapValid ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> VALID
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" /> {snapshot.invalidReason}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Top Right: Quick Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleCamera}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 transition"
            title="Tecla C"
          >
            <Camera className="h-3.5 w-3.5 text-sky-400" />
            CAM: {cameraMode.toUpperCase()}
          </button>

          <button
            onClick={onResetLap}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 transition"
            title="Tecla R"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            RESET (R)
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/80 transition"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            RANKING & TELEMETRY
          </button>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom Left: G-Force & Track Surface */}
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800/90 bg-zinc-950/80 px-4 py-3 backdrop-blur-md">
          <div className="relative h-16 w-16 rounded-full border border-zinc-700 bg-zinc-900/90 flex items-center justify-center">
            <div className="absolute inset-x-0 h-[1px] bg-zinc-800" />
            <div className="absolute inset-y-0 w-[1px] bg-zinc-800" />
            <div
              className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] transition-transform duration-75"
              style={{
                transform: `translate(${Math.max(-24, Math.min(24, snapshot.latG * 6))}px, ${Math.max(
                  -24,
                  Math.min(24, snapshot.longG * 6)
                )}px)`,
              }}
            />
          </div>
          <div className="text-xs space-y-1">
            <div className="text-zinc-400">
              LAT: <span className="text-zinc-100 font-bold">{snapshot.latG.toFixed(2)} G</span>
            </div>
            <div className="text-zinc-400">
              LON: <span className="text-zinc-100 font-bold">{snapshot.longG.toFixed(2)} G</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              SURF:{' '}
              <span
                className={
                  snapshot.surface === 'asphalt'
                    ? 'text-zinc-300'
                    : snapshot.surface === 'kerb'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {snapshot.surface}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Center: F1 Steering Wheel Dash (RPM LEDs, Speed, Gear, Pedals) */}
        <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-950/90 px-6 py-3.5 shadow-2xl backdrop-blur-md">
          {/* Shift Lights */}
          <div className="mb-2.5 flex gap-1.5">
            {Array.from({ length: ledCount }).map((_, idx) => {
              const lit = idx < activeLeds;
              let color = 'bg-zinc-800';
              if (lit) {
                if (idx < 5) color = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
                else if (idx < 10) color = 'bg-red-500 shadow-[0_0_8px_#ef4444]';
                else color = 'bg-sky-400 shadow-[0_0_10px_#38bdf8]';
              }
              return <div key={idx} className={`h-2.5 w-3.5 rounded-sm transition-colors ${color}`} />;
            })}
          </div>

          <div className="flex items-center gap-6">
            {/* Brake Bar */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-14 w-3 overflow-hidden rounded-sm bg-zinc-900 border border-zinc-800 flex flex-col justify-end">
                <div
                  className="w-full bg-rose-500 transition-all duration-75"
                  style={{ height: `${Math.round(snapshot.brake * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-500">BRK</span>
            </div>

            {/* Speed & Gear */}
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-3xl font-black tracking-tight text-white">
                  {Math.round(snapshot.speedKmh)}
                </div>
                <div className="text-[10px] text-zinc-500">KM/H</div>
              </div>

              <div className="flex h-14 w-12 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-3xl font-black text-amber-400">
                {gearLabel}
              </div>

              <div className="text-left">
                <div className="text-lg font-bold text-zinc-200">
                  {Math.round(snapshot.rpm)}
                </div>
                <div className="text-[10px] text-zinc-500">RPM</div>
              </div>
            </div>

            {/* Throttle Bar */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-14 w-3 overflow-hidden rounded-sm bg-zinc-900 border border-zinc-800 flex flex-col justify-end">
                <div
                  className="w-full bg-emerald-500 transition-all duration-75"
                  style={{ height: `${Math.round(snapshot.throttle * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-500">THR</span>
            </div>
          </div>

          {/* Assists Status */}
          <div className="mt-2 flex items-center gap-3 text-[10px]">
            <span
              className={`rounded px-1.5 py-0.5 ${
                snapshot.absActive ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              ABS
            </span>
            <span
              className={`rounded px-1.5 py-0.5 ${
                snapshot.tcActive ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              TC
            </span>
            <span className="text-zinc-500 flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              TICK #{snapshot.tick}
            </span>
          </div>
        </div>

        {/* Bottom Right: Controls Hint */}
        <div className="hidden md:block rounded-xl border border-zinc-800/90 bg-zinc-950/80 px-4 py-3 text-[11px] text-zinc-400 backdrop-blur-md">
          <div className="font-bold text-zinc-200 mb-1">CONTROLS</div>
          <div>W/S or ↑/↓ : Throttle / Brake</div>
          <div>A/D or ←/→ : Steer (Gamepad Ready)</div>
          <div>E / Q : Shift Up / Down</div>
        </div>
      </div>
    </div>
  );
};

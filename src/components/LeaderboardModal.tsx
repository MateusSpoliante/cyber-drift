import React from 'react';
import { Download, Trophy, X, CheckCircle2 } from 'lucide-react';
import { LapRecord } from '../types/sim';

interface LeaderboardModalProps {
  records: LapRecord[];
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ records, onClose }) => {
  const sorted = [...records].sort((a, b) => a.timeTicks - b.timeTicks);

  const exportTelemetry = (lap: LapRecord) => {
    const blob = new Blob([JSON.stringify(lap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-monza-${lap.timeFormatted.replace(':', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm font-mono">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">TIME TRIAL LEADERBOARD & TELEMETRY</h2>
              <p className="text-xs text-zinc-400">
                Voltas validadas por log de entradas determinístico (240 Hz)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-xs text-zinc-500">
              Nenhuma volta válida completada ainda. Complete uma volta limpa em Monza para registrar seu tempo e exportar telemetria!
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-[10px] uppercase text-zinc-500">
                <tr>
                  <th className="py-2">POS</th>
                  <th className="py-2">DRIVER</th>
                  <th className="py-2">LAP TIME</th>
                  <th className="py-2">S1 / S2 / S3</th>
                  <th className="py-2">ASSISTS</th>
                  <th className="py-2 text-right">TELEMETRY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {sorted.map((lap, idx) => (
                  <tr key={lap.id} className="hover:bg-zinc-900/50">
                    <td className="py-2.5 font-bold text-amber-400">#{idx + 1}</td>
                    <td className="py-2.5 flex items-center gap-1.5 text-zinc-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {lap.driver}
                    </td>
                    <td className="py-2.5 font-bold text-white">{lap.timeFormatted}</td>
                    <td className="py-2.5 text-zinc-400">
                      {lap.sector1Formatted} / {lap.sector2Formatted} / {lap.sector3Formatted}
                    </td>
                    <td className="py-2.5 text-[10px] text-zinc-400">{lap.assists}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => exportTelemetry(lap)}
                        className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] text-sky-300 hover:bg-zinc-700"
                      >
                        <Download className="h-3 w-3" /> JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Speed Trace Preview of Best Lap */}
        {sorted.length > 0 && sorted[0].telemetry.length > 2 && (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="mb-2 flex justify-between text-[11px] text-zinc-400">
              <span>BEST LAP SPEED TRACE (KM/H)</span>
              <span>MAX: {Math.round(Math.max(...sorted[0].telemetry.map((t) => t.speedKmh)))} KM/H</span>
            </div>
            <svg viewBox="0 0 600 90" className="h-20 w-full overflow-visible">
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                points={sorted[0].telemetry
                  .map((sample, i, arr) => {
                    const x = (i / Math.max(1, arr.length - 1)) * 600;
                    const y = 85 - Math.min(80, (sample.speedKmh / 350) * 80);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

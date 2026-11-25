import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { CarSetup } from '../types/sim';

interface SetupModalProps {
  setup: CarSetup;
  onChange: (setup: CarSetup) => void;
  onClose: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ setup, onChange, onClose }) => {
  const update = <K extends keyof CarSetup>(key: K, val: CarSetup[K]) => {
    onChange({ ...setup, [key]: val });
  };

  const applyPreset = (type: 'low_drag' | 'balanced' | 'high_df') => {
    if (type === 'low_drag') {
      onChange({
        ...setup,
        frontWing: 4,
        rearWing: 4,
        brakeBias: 58,
        diffOnThrottle: 75,
        tirePressure: 22.2,
      });
    } else if (type === 'balanced') {
      onChange({
        ...setup,
        frontWing: 8,
        rearWing: 8,
        brakeBias: 57,
        diffOnThrottle: 70,
        tirePressure: 21.5,
      });
    } else {
      onChange({
        ...setup,
        frontWing: 13,
        rearWing: 14,
        brakeBias: 55,
        diffOnThrottle: 65,
        tirePressure: 20.8,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm font-mono">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">CAR SETUP & GARAGE</h2>
            <p className="text-xs text-zinc-400">
              Ajustes aplicados em tempo real no núcleo físico 240 Hz
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('low_drag')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-red-500"
          >
            Monza Low Drag (Top Speed)
          </button>
          <button
            onClick={() => applyPreset('balanced')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-red-500"
          >
            Balanced Baseline
          </button>
          <button
            onClick={() => applyPreset('high_df')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-red-500"
          >
            High Downforce (Grip)
          </button>
        </div>

        {/* Sliders */}
        <div className="mt-5 space-y-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-zinc-400">FRONT WING AERO</span>
              <span className="font-bold text-white">{setup.frontWing} / 15</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={setup.frontWing}
              onChange={(e) => update('frontWing', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-zinc-400">REAR WING AERO</span>
              <span className="font-bold text-white">{setup.rearWing} / 15</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={setup.rearWing}
              onChange={(e) => update('rearWing', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-zinc-400">BRAKE BIAS (FRONT %)</span>
              <span className="font-bold text-white">{setup.brakeBias}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={65}
              value={setup.brakeBias}
              onChange={(e) => update('brakeBias', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-zinc-400">DIFFERENTIAL ON-THROTTLE</span>
              <span className="font-bold text-white">{setup.diffOnThrottle}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={setup.diffOnThrottle}
              onChange={(e) => update('diffOnThrottle', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-zinc-400">TIRE PRESSURE (OPTIMAL 21.5 PSI)</span>
              <span className="font-bold text-white">{setup.tirePressure.toFixed(1)} PSI</span>
            </div>
            <input
              type="range"
              min={19.0}
              max={24.0}
              step={0.1}
              value={setup.tirePressure}
              onChange={(e) => update('tirePressure', Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Assists Toggles */}
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 cursor-pointer">
              <span>AUTO SHIFT</span>
              <input
                type="checkbox"
                checked={setup.autoGearbox}
                onChange={(e) => update('autoGearbox', e.target.checked)}
                className="accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 cursor-pointer">
              <span>TRACTION CTRL</span>
              <input
                type="checkbox"
                checked={setup.tractionControl}
                onChange={(e) => update('tractionControl', e.target.checked)}
                className="accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 cursor-pointer">
              <span>ABS BRAKES</span>
              <input
                type="checkbox"
                checked={setup.abs}
                onChange={(e) => update('abs', e.target.checked)}
                className="accent-red-500"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => applyPreset('balanced')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500"
          >
            APPLY & DRIVE
          </button>
        </div>
      </div>
    </div>
  );
};

import { FIXED_HZ } from '../physics/simCore';

export function formatLapTicks(ticks: number | null): string {
  if (ticks === null || ticks <= 0) return '--:--.---';
  const totalSeconds = ticks / FIXED_HZ;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const minStr = minutes > 0 ? `${minutes}:` : '';
  const secStr = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const msStr = String(millis).padStart(3, '0');
  return `${minStr}${secStr}.${msStr}`;
}

export function formatDeltaTicks(deltaTicks: number | null): string {
  if (deltaTicks === null) return '±0.000';
  const sec = deltaTicks / FIXED_HZ;
  const sign = sec >= 0 ? '+' : '-';
  return `${sign}${Math.abs(sec).toFixed(3)}`;
}

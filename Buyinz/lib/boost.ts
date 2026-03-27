/** Active boost: expiration is in the future. */
export function isBoostActive(boostedUntil: string | null | undefined): boolean {
  if (boostedUntil == null || boostedUntil === '') return false;
  return new Date(boostedUntil) > new Date();
}

/** Remaining time until boost ends, as HH:MM (hours may exceed 24). */
export function formatBoostCountdownHHMM(boostedUntilIso: string | null): string {
  if (!boostedUntilIso) return '00:00';
  const ms = new Date(boostedUntilIso).getTime() - Date.now();
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

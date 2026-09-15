/** Small formatting helpers shared by the game screens. */
import type { Delta } from '@jones2/sim';

export function hm(m: number): string {
  const mins = Math.round(m);
  return `${Math.floor(mins / 60)}h${String(((mins % 60) + 60) % 60).padStart(2, '0')}`;
}

export function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

export function Deltas({ deltas }: { deltas: Delta[] }) {
  if (!deltas.length) return null;
  return (
    <span className="muted">
      {' '}
      {deltas
        .filter((d) => Math.abs(d.amount) >= 0.05)
        .map((d, i) => (
          <span key={i} className="tag">
            {d.stat} {d.amount > 0 ? '+' : ''}
            {d.stat === 'cash' || d.stat === 'savings' || d.stat === 'loan' ? Math.round(d.amount) : d.amount.toFixed(1)}
            {d.note ? ` (${d.note})` : ''}
          </span>
        ))}
    </span>
  );
}

/**
 * Which sound a game event deserves. Works from the sim's player log, which
 * already says what happened ("Hired as Cook…", "Refused Manager…", "Worked
 * 6h…") so the mapping is by action type first and by the outcome text where
 * one action can end two ways. Pure.
 */
import type { PlayerEvent } from '@jones2/sim';
import type { SfxKey } from './map';

export function sfxForEvent(ev: PlayerEvent): SfxKey | null {
  const t = ev.action.type as string;
  const text = ev.text ?? '';
  if (t.startsWith('buy')) return 'buy';
  switch (t) {
    case 'work':
      return 'cash';
    case 'apply':
      return /^hired/i.test(text) ? 'hired' : 'refused';
    case 'raise':
      return /raise to/i.test(text) ? 'hired' : 'refused';
    case 'class':
      return /^graduated/i.test(text) ? 'graduate' : 'study';
    case 'enroll':
      return 'study';
    case 'endWeek':
      return 'timesUp';
    case 'payRent':
    case 'rent':
    case 'loanPayment':
    case 'bank':
    case 'sellStock':
    case 'redeemItem':
    case 'pawnItem':
      return 'cash';
    case 'rentExtension':
    case 'applyLoan':
      return /approved|granted|extended|loan of/i.test(text) ? 'cash' : 'refused';
    case 'lottery':
    case 'newspaper':
      return 'buy';
    default:
      // travel (the walk plays its own sound), relax, broker, quit, endWeek handled above
      return null;
  }
}

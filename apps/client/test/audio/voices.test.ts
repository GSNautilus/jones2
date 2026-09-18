import { describe, expect, it } from 'vitest';
import type { PlayerEvent } from '@jones2/sim';
import { cardLine, greetingLine, quoteGroupFor, quoteGroupsFor, quoteLine, refusalGroupFor, voiceFile, type VoicesFile } from '../../src/audio/voices';

const V: VoicesFile = {
  rate: 11025,
  greetings: { employment: [301, 302, 303], lowcost: [] },
  quotes: { rent_office: { 'Pay Rent': [345, 346] } },
  cards: {
    weekend: [
      { line: 230, text: 'You spent the whole weekend watching some of the food in your refrigerator grow mold and spores. It sure was fun.' },
      { line: 249, text: 'You stayed home and did absolutely nothing this weekend.' },
    ],
    news: [{ line: 460, text: 'BANKS FALTER!\nSAVINGS LOST!  JOBS LOST!' }],
  },
  unresolved: [],
};

function ev(action: PlayerEvent['action'], text = ''): PlayerEvent {
  return { minute: 0, duration: 0, action, node: 'employment', deltas: [], text } as PlayerEvent;
}

describe('voices', () => {
  it('names the file by line number', () => {
    expect(voiceFile(7)).toBe('audio/voice/line_007.ogg');
    expect(voiceFile(612)).toBe('audio/voice/line_612.ogg');
  });

  it('picks the greeting by index and wraps like the bubble does', () => {
    expect(greetingLine(V, 'employment', 0)).toBe(301);
    expect(greetingLine(V, 'employment', 4)).toBe(302);
    expect(greetingLine(V, 'lowcost', 0)).toBeNull();
    expect(greetingLine(V, 'bank', 0)).toBeNull();
  });

  it('rotates through a quote group and is silent for unknown groups', () => {
    expect(quoteLine(V, 'rent_office', 'Pay Rent', 0)).toBe(345);
    expect(quoteLine(V, 'rent_office', 'Pay Rent', 3)).toBe(346);
    expect(quoteLine(V, 'rent_office', 'Extension Approved', 0)).toBeNull();
    expect(quoteLine(V, 'zmart', 'Pay Rent', 0)).toBeNull();
  });

  it('maps outcomes to the quote groups', () => {
    expect(quoteGroupFor(ev({ type: 'buyFood', foodId: 'hamburgers' } as PlayerEvent['action'], 'Bought Hamburgers.'))).toBe('Bought an Item');
    expect(quoteGroupFor(ev({ type: 'apply', jobId: 'monolith_cook' }, 'Hired as Cook at $5/h.'))).toBe('Got the Job');
    expect(quoteGroupFor(ev({ type: 'apply', jobId: 'monolith_cook' }, 'Refused Cook: no openings.'))).toBe('No Openings');
    expect(quoteGroupFor(ev({ type: 'apply', jobId: 'monolith_cook' }, 'Refused Cook: not enough education.'))).toBe('Not Hired');
    expect(quoteGroupFor(ev({ type: 'rentExtension' } as PlayerEvent['action'], 'Extension approved: rent is due next week.'))).toBe('Extension Approved');
    expect(quoteGroupFor(ev({ type: 'rentExtension' } as PlayerEvent['action'], 'Extension refused.'))).toBe('Extension Rejected');
    expect(quoteGroupFor(ev({ type: 'rent', housingId: 'security_apts' } as PlayerEvent['action'], 'Moved into Le Security Apartments.'))).toBe('Renting Security Apartment');
    expect(quoteGroupFor(ev({ type: 'bank', op: 'withdraw', amount: 5 } as PlayerEvent['action'], 'Withdrew $5.'))).toBe('Withdrawing Cash');
    expect(quoteGroupFor(ev({ type: 'travel', to: 'bank' }, 'Walked to Bank'))).toBeNull();
  });

  it('says the reasons for a refusal one after another', () => {
    expect(quoteGroupsFor(ev({ type: 'apply', jobId: 'x' }, 'Refused Manager: not enough experience, dependability, education.'))).toEqual([
      'Not Hired',
      'Not Enough Education',
      'Not Enough Experience',
      'Poor Work History',
    ]);
    expect(quoteGroupsFor(ev({ type: 'work' }, 'You were fired from Cook: your dependability is too low.'))).toEqual(['Fired']);
    expect(quoteGroupsFor(ev({ type: 'work' }, 'Worked 6h as Cook'))).toEqual([]);
    expect(quoteGroupsFor(ev({ type: 'pawnItem', itemId: 'stereo' } as PlayerEvent['action'], 'Pawned the Stereo.'))).toEqual(['Thanks']);
  });

  it('names what there was no time for', () => {
    expect(refusalGroupFor('Not enough cash')).toBe('Not Enough Cash');
    expect(refusalGroupFor('Not enough time', 'work')).toBe('No Time to Work');
    expect(refusalGroupFor('Not enough time', 'applyLoan')).toBe('No Time for Loan');
    expect(refusalGroupFor('Not enough time', 'payRent')).toBe('No Time');
    expect(refusalGroupFor('Needs casual clothes', 'work')).toBe('Not Dressed');
    expect(refusalGroupFor('Week is over')).toBeNull();
  });

  it('finds a card line by the text the card shows, whatever the punctuation', () => {
    expect(cardLine(V, 'weekend', 'You stayed home and did absolutely nothing this weekend.')).toBe(249);
    expect(cardLine(V, 'news', 'DAILY NEWS: BANKS FALTER! SAVINGS LOST! JOBS LOST!')).toBe(460);
    expect(cardLine(V, 'weekend', 'You spent the weekend watching some of the food in your refrigerator grow mold and spores. It sure was fun.')).toBe(230);
    expect(cardLine(V, 'weekend', 'You went bowling with friends this weekend.')).toBeNull();
    expect(cardLine(V, 'lottery', 'You won')).toBeNull();
  });
});

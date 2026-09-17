/**
 * The full Happiness table. Source: "# Happiness Goal" > "## Increasing Happiness" (199-259) and
 * "## Decreasing Happiness" (260-299), original-rules.md. A few entries duplicated/refined by a
 * dedicated section elsewhere are cited individually below.
 */
export type HappinessSourceKind = 'event' | 'action' | 'purchase';

export interface HappinessEntry {
  /** Unique key — no two entries may share one (enforced by a test). */
  id: string;
  label: string;
  kind: HappinessSourceKind;
  /** Fixed amount, or a [min, max] range for randomised amounts. */
  amount: number | [number, number];
  notes: string;
}

export const CLASSIC_HAPPINESS: HappinessEntry[] = [
  // --- Increasing: Events ("### Events", 205-213) ---
  { id: 'own_microwave_or_stove', label: 'Owning a Microwave or Stove at the start of a new Turn', kind: 'event', amount: 1, notes: 'Owning both only awards +1, not +2, per turn.' },
  { id: 'economic_boom', label: 'Economic Boom', kind: 'event', amount: 5, notes: 'Only if the player has at least $1000 invested in the Stock Market.' },
  { id: 'weekend_senior_bus', label: "Weekend involves driving a senior citizens' bus", kind: 'event', amount: [2, 4], notes: 'About a 1/41 chance each turn (Weekend #42, "Oh What a Weekend!").' },
  { id: 'computer_income', label: 'Make money using the Computer', kind: 'event', amount: 3, notes: '1/7 chance each turn, only if the player owns a Computer.' },
  { id: 'lottery_small_or_medium', label: 'Win the Lottery, small or medium prize', kind: 'event', amount: 5, notes: 'About 1/500 chance per Lottery Ticket.' },
  { id: 'lottery_jackpot', label: 'Win $5000 in the Lottery', kind: 'event', amount: 10, notes: 'About 1/10000 chance per Lottery Ticket.' },

  // --- Increasing: Actions ("### Actions", 215-223) ---
  { id: 'relax_first_this_turn', label: 'Relax at your Apartment', kind: 'action', amount: 2, notes: 'Only the first Relax this Turn; extra Relaxing raises the Relaxation stat but not Happiness.' },
  { id: 'new_job', label: 'Get a new Job', kind: 'action', amount: 3, notes: 'Each time. "# Employment Office" > "## Applying for a Job" (1792-1795) confirms the same +3.' },
  { id: 'raise', label: 'Get a Raise', kind: 'action', amount: 3, notes: 'Each time. "## Asking for a Raise" (1892-1895) confirms the same +3.' },
  { id: 'bank_loan', label: 'Get a Bank Loan', kind: 'action', amount: 5, notes: 'Each time. Matches LOAN_APPROVED_HAPPINESS in bank.ts.' },
  { id: 'rent_extension_approved', label: 'Get a Rent Extension', kind: 'action', amount: 1, notes: 'Each time.' },
  { id: 'new_degree', label: 'Get a new Degree', kind: 'action', amount: 5, notes: "Each time. \"# Hi-Tech U\" > \"## Graduating\" (2682-2686) confirms +5." },

  // --- Increasing: Purchases ("### Purchases", 225-259) ---
  { id: 'buy_fridge_socket', label: 'Refrigerator (Socket City)', kind: 'purchase', amount: 1, notes: 'Only if the player owns zero of the item before this purchase.' },
  { id: 'buy_freezer_socket', label: 'Freezer (Socket City)', kind: 'purchase', amount: 2, notes: 'First-owned rule as above.' },
  { id: 'buy_stove_socket', label: 'Stove (Socket City)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_color_tv_socket', label: 'Color TV (Socket City)', kind: 'purchase', amount: 2, notes: 'First-owned rule as above.' },
  { id: 'buy_vcr_socket', label: 'VCR (Socket City)', kind: 'purchase', amount: 2, notes: 'First-owned rule as above.' },
  { id: 'buy_stereo_socket', label: 'Stereo (Socket City)', kind: 'purchase', amount: 2, notes: 'First-owned rule as above.' },
  { id: 'buy_microwave_socket', label: 'Microwave (Socket City)', kind: 'purchase', amount: 2, notes: 'First-owned rule as above.' },
  { id: 'buy_hot_tub_socket', label: 'Hot Tub (Socket City)', kind: 'purchase', amount: 3, notes: 'First-owned rule as above.' },
  { id: 'buy_computer_socket', label: 'Computer (Socket City)', kind: 'purchase', amount: 3, notes: 'First-owned rule as above.' },
  { id: 'buy_fridge_zmart', label: 'Refrigerator (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above; lower bonus than Socket City for the same item elsewhere (see Color TV/VCR/Microwave/Stereo below).' },
  { id: 'buy_stove_zmart', label: 'Stove (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_color_tv_zmart', label: 'Color TV (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_vcr_zmart', label: 'VCR (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_stereo_zmart', label: 'Stereo (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_microwave_zmart', label: 'Microwave (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_encyclopedia', label: 'Encyclopedia (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_dictionary', label: 'Dictionary (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_atlas', label: 'Atlas (Z-Mart)', kind: 'purchase', amount: 1, notes: 'First-owned rule as above.' },
  { id: 'buy_baseball_tickets', label: 'Baseball Tickets (Z-Mart)', kind: 'purchase', amount: 2, notes: 'Only the first purchase of this ticket type this Turn; cumulative with other ticket types, max +6/turn.' },
  { id: 'buy_theatre_tickets', label: 'Theatre Tickets (Z-Mart)', kind: 'purchase', amount: 2, notes: 'Same rule as Baseball Tickets.' },
  { id: 'buy_concert_tickets', label: 'Concert Tickets (Z-Mart)', kind: 'purchase', amount: 2, notes: 'Same rule as Baseball Tickets.' },
  { id: 'buy_fresh_food_1', label: "1 Week of Food (Black's Market)", kind: 'purchase', amount: 1, notes: 'Only the first Fresh Food purchase this Turn.' },
  { id: 'buy_fresh_food_2', label: "2 Weeks of Food (Black's Market)", kind: 'purchase', amount: 2, notes: 'Only the first Fresh Food purchase this Turn.' },
  { id: 'buy_fresh_food_4', label: "4 Weeks of Food (Black's Market)", kind: 'purchase', amount: 4, notes: 'Only the first Fresh Food purchase this Turn.' },
  { id: 'buy_lottery_tickets', label: "Lottery Tickets (Black's Market)", kind: 'purchase', amount: 2, notes: 'Only the first ticket purchase this Turn. Matches LOTTERY.happiness in food.ts.' },
  { id: 'buy_dress_clothes', label: 'Dress Clothes (QT Clothing)', kind: 'purchase', amount: 1, notes: 'Every purchase (not just the first). Z-Mart clothing gives no Happiness.' },
  { id: 'buy_business_suit', label: 'Business Suit (QT Clothing)', kind: 'purchase', amount: 2, notes: 'Every purchase.' },
  { id: 'buy_cheeseburger', label: 'Cheeseburger (Monolith Burgers)', kind: 'purchase', amount: 1, notes: 'Only the first Cheeseburger-or-Astro-Chicken purchase this Turn.' },
  { id: 'buy_astro_chicken', label: 'Astro Chicken (Monolith Burgers)', kind: 'purchase', amount: 2, notes: 'Only the first Cheeseburger-or-Astro-Chicken purchase this Turn.' },
  { id: 'buy_colas', label: 'Colas (Monolith Burgers)', kind: 'purchase', amount: 1, notes: 'Only the first Colas-or-Shakes purchase this Turn.' },
  { id: 'buy_shakes', label: 'Shakes (Monolith Burgers)', kind: 'purchase', amount: 2, notes: 'Only the first Colas-or-Shakes purchase this Turn.' },

  // --- Decreasing: Events ("### Events", 266-281) ---
  { id: 'starvation', label: 'Starvation', kind: 'event', amount: -2, notes: 'No Fast Food bought and no Fresh Food owned. Matches STARVATION_HAPPINESS in food.ts.' },
  { id: 'doctor_visit', label: 'Doctor Visit', kind: 'event', amount: -4, notes: 'Eating spoiled food (50% chance) or Relaxation at minimum (20% chance). See weekend.ts DOCTOR.' },
  {
    id: 'appliance_broken', label: 'Appliance broken', kind: 'event', amount: -1,
    notes: 'Per Appliance that broke. This table\'s "1/35 or 1/50" chance figure is rougher than, and CONTRADICTS, the dedicated "# Appliances" > "## Repairs" figures (1/51 Socket City, 1/36 Z-Mart/Pawn Shop) in items.ts — items.ts is the source of truth for the chance.',
  },
  { id: 'all_food_spoiled', label: 'All Food Spoiled', kind: 'event', amount: -2, notes: 'Owning Fresh Food but no Refrigerator. Matches SPOIL_NO_FRIDGE_HAPPINESS in food.ts.' },
  { id: 'some_food_spoiled', label: 'Some Food Spoiled', kind: 'event', amount: -1, notes: 'Owning more Fresh Food than the Refrigerator(+Freezer) can store. Matches SPOIL_OVER_CAPACITY_HAPPINESS in food.ts.' },
  { id: 'crash_minor', label: 'Minor Market Crash', kind: 'event', amount: -1, notes: 'Only to the player whose turn it is when the crash occurs. Additional -1 if the player has $1000+ in stocks (see economy.ts CRASH_STOCK_PENALTY).' },
  { id: 'crash_moderate', label: 'Moderate Market Crash', kind: 'event', amount: -2, notes: 'Additional -2 if $1000+ in stocks.' },
  { id: 'crash_major', label: 'Major Market Crash', kind: 'event', amount: -3, notes: 'Additional -5 if $1000+ in stocks.' },
  { id: 'crash_job_loss', label: 'Lost Job due to Market Crash', kind: 'event', amount: -7, notes: 'May occur on a Major Crash; cumulative with crash_major.' },
  { id: 'crash_wage_cut', label: 'Wage reduction due to Market Crash', kind: 'event', amount: -3, notes: 'May occur on a Moderate or Major Crash; cumulative with the crash penalty.' },
  { id: 'mugged_bank', label: 'Mugged on the Street by Wild Willy (leaving the Bank)', kind: 'event', amount: -3, notes: '1/31 chance each time you leave the Bank with Cash. See weekend.ts WILD_WILLY.streetRobbery.' },
  { id: 'mugged_blacks_market', label: "Mugged on the Street by Wild Willy (leaving Black's Market)", kind: 'event', amount: -3, notes: "1/51 chance each time you leave Black's Market with Cash." },
  { id: 'apartment_robbed', label: 'Apartment robbed by Wild Willy', kind: 'event', amount: -4, notes: 'Only at Low-Cost Housing. See weekend.ts WILD_WILLY.apartmentRobbery.' },
  { id: 'loan_defaulted', label: 'Defaulted on a Loan', kind: 'event', amount: -1, notes: 'Once per Month while Loan Debts are left unpaid. Matches LOAN_DEFAULT_HAPPINESS in bank.ts.' },

  // --- Decreasing: Actions ("### Actions", 283-291) ---
  { id: 'job_refused', label: 'Refused a new Job', kind: 'action', amount: -1, notes: 'Per refusal. Matches "## Applying for a Job" (1809-1812).' },
  { id: 'loan_denied_no_loan', label: "Denied a Loan (player doesn't currently have one)", kind: 'action', amount: -2, notes: 'Per refusal. CONTRADICTS "# Loans" > "## Applying for a Loan" (5493-5496), which gives a flat -1 for any denial regardless of an existing loan. Followed this more detailed, two-tier table.' },
  { id: 'loan_denied_has_loan', label: 'Denied a Loan Increase (player already has a loan)', kind: 'action', amount: -1, notes: 'Per refusal. See loan_denied_no_loan contradiction note.' },
  { id: 'rent_extension_refused', label: 'Refused Rent Extension', kind: 'action', amount: -1, notes: 'Only on the first attempt each Turn.' },
  { id: 'item_pawned', label: 'Pawned any Item', kind: 'action', amount: -1, notes: 'On each Pawning. Matches PAWN_HAPPINESS in items.ts.' },
  { id: 'fridge_pawned_with_food', label: 'Pawned a Refrigerator while owning Fresh Food', kind: 'action', amount: -1, notes: 'On top of item_pawned (total -2). Matches PAWN_FRIDGE_WITH_FOOD_HAPPINESS in items.ts.' },

  // --- Decreasing: Purchases ("### Purchases", 293-299) ---
  { id: 'buy_dog_food', label: 'Dog Food (Z-Mart)', kind: 'purchase', amount: -1, notes: 'Every purchase. Matches items.ts dog_food.' },
  { id: 'buy_eight_track', label: '8-Track Player (Z-Mart)', kind: 'purchase', amount: -1, notes: 'Every purchase. Matches items.ts eight_track.' },
  { id: 'buy_works_of_capote', label: 'Works of Capote (Z-Mart)', kind: 'purchase', amount: -2, notes: 'Every purchase. Matches items.ts works_of_capote.' },
];

/**
 * Getting Fired has NO documented Happiness number. "# Jobs" > "## Losing a Job" (1649-1651)
 * only says "The only penalty for losing a Job is a loss of Happiness", without a figure.
 * Deliberately left out of CLASSIC_HAPPINESS rather than inventing a value — flagged as an open
 * question for the ruleset author.
 */
export const FIRED_HAPPINESS_UNDOCUMENTED = true;

export const CLASSIC_HAPPINESS_MAP: Record<string, HappinessEntry> = Object.fromEntries(CLASSIC_HAPPINESS.map((h) => [h.id, h]));

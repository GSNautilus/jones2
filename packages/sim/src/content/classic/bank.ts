import type { ClassicStockId } from './ids';

/**
 * Bank Account, Loans, and the Stock Market (accessed via the Bank's "See the Broker").
 * Source: "# Bank" (5219-5451), "# Loans" (5455-5879), "# Stocks" (5883-5992), "# Broker"
 * (5997-6039).
 */

// "## Bank Account" (5283-5305)
export const BANK_DEPOSIT_INCREMENT = 100;
export const BANK_WITHDRAW_INCREMENT = 100;
export const BANK_DEPOSIT_FEE = 0;
export const BANK_INTEREST_RATE = 0; // "no interest is accrued for money kept in a Bank Account"

// "# Loans" > "## Applying for a Loan" (5473-5510)
export const LOAN_APPLICATION_DENIED_HAPPINESS = -1;
export const LOAN_APPROVED_HAPPINESS = 5;

/**
 * Liquidity = current Wage + LiquidAssets/1000. "### Liquidity" (5511-5592).
 */
export function loanLiquidity(wage: number, liquidAssets: number): number {
  return wage + liquidAssets / 1000;
}

/**
 * Risk Factor. First-ever loan (never taken one, or all past loans repaid without defaulting) is
 * a flat 5. Otherwise: 5 + timesDefaulted + currentLoanDebt/100 + (1 if currentLoanDebt > 0).
 * "### Risk Factor" (5594-5749).
 */
export function loanRiskFactor(timesDefaulted: number, currentLoanDebt: number, hasHadALoan: boolean): number {
  if (!hasHadALoan) return 5;
  return 5 + timesDefaulted + currentLoanDebt / 100 + (currentLoanDebt > 0 ? 1 : 0);
}

/** Loan is approved iff liquidity > risk. Size = $100 * (liquidity - risk). "## Loan Size" (5751-5817). */
export function loanSize(liquidity: number, risk: number): number {
  return 100 * (liquidity - risk);
}

// "## Loan Payments" (5819-5849)
/** Each payment click removes this much Cash... */
export const LOAN_PAYMENT_CASH = 50;
/** ...of which this much clears Debt... */
export const LOAN_PAYMENT_TO_DEBT = 45;
/** ...and this much is a pure interest fee to the Bank. */
export const LOAN_PAYMENT_INTEREST_FEE = 5;
/** If remaining debt is below LOAN_PAYMENT_CASH, that whole (smaller) amount clears it, fee-free. */
export const LOAN_PAYMENT_MIN_NO_FEE_THRESHOLD = 50;
/** A payment (partial or full) that doesn't fully clear the debt pushes the next due date out by this many weeks. */
export const LOAN_PAYMENT_DEFERS_WEEKS = 4;

// "## Loan Default" (5851-5879)
/** Happiness lost once per Month while any Loan Debt is left unpaid past the due date. */
export const LOAN_DEFAULT_HAPPINESS = -1;

// "# Stocks" > "## List of Stocks" (5923-5931)
export interface ClassicStock {
  id: ClassicStockId;
  name: string;
  basePrice: number;
  /** T-Bills never fluctuate — min/max are undefined for it. */
  minPrice?: number;
  maxPrice?: number;
  notes?: string;
}

export const CLASSIC_STOCKS: Record<ClassicStockId, ClassicStock> = {
  t_bills: { id: 't_bills', name: 'T-Bills', basePrice: 100, notes: 'Fixed price, never fluctuates. 3% fee on sale (see T_BILL_SELL_FEE). Cannot be robbed or wiped by a crash.' },
  gold: { id: 'gold', name: 'Gold', basePrice: 413, minPrice: 206, maxPrice: 1032 },
  silver: { id: 'silver', name: 'Silver', basePrice: 14, minPrice: 7, maxPrice: 35 },
  pork_bellies: { id: 'pork_bellies', name: 'Pork Bellies', basePrice: 20, minPrice: 10, maxPrice: 50 },
  blue_chip: { id: 'blue_chip', name: 'Blue Chip Stocks', basePrice: 49, minPrice: 24, maxPrice: 122 },
  penny_stocks: { id: 'penny_stocks', name: 'Penny Stocks', basePrice: 7, minPrice: 3, maxPrice: 17, notes: 'Cheapest and most volatile as a fraction of price.' },
};

export const CLASSIC_STOCK_LIST: ClassicStock[] = Object.values(CLASSIC_STOCKS);

export const T_BILL_SELL_FEE = 0.03;
/** Non-T-Bill stocks range between these fractions of their base price. "## Stock Prices" (5961-5982). */
export const STOCK_PRICE_RANGE = { min: 0.5, max: 2.5 } as const;
/**
 * NOTE: the wiki explicitly declines to document the exact stock-price formula ("the actual
 * formula ... is quite complicated ... will not be described here", 5981-5982) beyond: it trends
 * with a derived Economic Index, then a stock-market-wide trend, then 6 more per-stock rolls.
 * Left unspecified on purpose — no invented formula here.
 */
export const STOCK_PRICE_FORMULA_DOCUMENTED = false;

/**
 * Wild Willy can rob a player of all Cash as they leave the Bank (1/31) or Black's Market
 * (1/51) — see weekend.ts's WILD_WILLY.streetRobbery for the shared table. "# Bank" > "## Wild
 * Willy" (5371-5389) and "# Wild Willy" > "## Street Robbery" (6597-6639).
 */

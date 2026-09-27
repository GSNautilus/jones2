/** The Bank (account, loans, the broker) and the Rent Office (rent, extensions, moving). */
import {
  CLASSIC_HOUSING,
  RENT_EXTENSION_APPROVAL_CHANCE,
  RENT_EXTENSION_APPROVAL_FLOOR,
  T_BILL_SELL_FEE,
  loanLiquidity,
  loanRiskFactor,
  loanSize,
} from '../content/classic';
import { applyDelta } from '../helpers';
import { chance } from '../rng';
import type { Action, Delta } from '../types';
import { d, earn, happy, pay } from './effects';
import { liquidAssets, playerRoll, stockPrice } from './state';
import { monthAfter, priceOf, rentOfficeOpen, type Ctx, type Spec } from './context';

/** Banking, loans, stocks and everything the Rent Office does. Null if not one of those. */
export function moneySpec(cx: Ctx, a: Action): Spec | string | null {
  const { state, p, c, at } = cx;
  switch (a.type) {
    case 'bank': {
      const amount = Math.round(a.amount);
      if (a.op === 'borrow' || a.op === 'repay') return 'Use applyLoan / loanPayment in the classic ruleset';
      return {
        label: `${a.op === 'deposit' ? 'Deposit' : 'Withdraw'} $${amount}`,
        hours: 0,
        cost: 0,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (amount <= 0) return 'Amount must be positive';
          if (a.op === 'deposit' && amount > p.cash) return 'Not enough cash';
          if (a.op === 'withdraw' && amount > p.savings) return 'Not enough in the bank';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          const sign = a.op === 'deposit' ? 1 : -1;
          deltas.push(applyDelta(p, d('cash', -sign * amount)));
          deltas.push(applyDelta(p, d('savings', sign * amount)));
          return { text: `${a.op === 'deposit' ? 'Deposited' : 'Withdrew'} $${amount}.`, deltas };
        },
      };
    }

    case 'applyLoan': {
      const liquidity = loanLiquidity(c.wage, liquidAssets(state, p));
      const risk = loanRiskFactor(c.loanDefaults, p.loan, c.hasHadLoan);
      const size = Math.max(0, Math.round(loanSize(liquidity, risk)));
      return {
        label: `Apply for a loan (about $${size})`,
        hours: 2,
        cost: 0,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (!c.jobId) return 'The bank does not lend to the unemployed';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          if (c.inDefault || liquidity <= risk) {
            happy(p, p.loan > 0 ? 'loan_denied_has_loan' : 'loan_denied_no_loan', deltas);
            return { text: 'The bank refused your loan.', deltas };
          }
          deltas.push(applyDelta(p, d('loan', size, 'loan')));
          earn(p, size, 'loan', deltas);
          c.hasHadLoan = true;
          c.loanDueWeek = monthAfter(state.week);
          happy(p, 'bank_loan', deltas);
          return { text: `The bank lent you $${size}.`, deltas };
        },
      };
    }

    case 'loanPayment': {
      const full = p.loan > 0 && p.loan < 50;
      const cashCost = full ? Math.round(p.loan) : 50;
      return {
        label: full ? `Clear your loan ($${cashCost})` : 'Make a loan payment ($50)',
        hours: 0,
        cost: cashCost,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (p.loan <= 0) return 'You have no loan';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, cashCost, 'loan payment', deltas);
          const toDebt = full ? cashCost : 45;
          deltas.push(applyDelta(p, d('loan', -toDebt, 'loan payment')));
          c.week.paidLoan = true;
          c.inDefault = false;
          if (p.loan > 0) c.loanDueWeek = state.week + 4;
          else c.loanDueWeek = 0;
          return { text: p.loan > 0 ? `Paid $${cashCost} toward your loan.` : 'Loan cleared.', deltas };
        },
      };
    }

    case 'broker':
      return {
        label: 'See the broker',
        hours: 2,
        cost: 0,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (c.week.brokerOpen) return 'You have already seen the broker this week';
          return null;
        },
        run: () => {
          c.week.brokerOpen = true;
          return { text: 'The broker showed you this week’s prices.', deltas: [] };
        },
      };

    case 'buyStock': {
      const unit = stockPrice(state, a.stockId);
      const units = Math.max(0, Math.round(a.units));
      const price = unit * units;
      return {
        label: `Buy ${units} x ${a.stockId} ($${price})`,
        hours: 0,
        cost: price,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (!c.week.brokerOpen) return 'See the broker first';
          if (units <= 0) return 'Buy at least one unit';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, 'stocks', deltas);
          c.stocks[a.stockId] = (c.stocks[a.stockId] ?? 0) + units;
          deltas.push(d('stocks', units, a.stockId));
          return { text: `Bought ${units} units of ${a.stockId}.`, deltas };
        },
      };
    }

    case 'sellStock': {
      const unit = stockPrice(state, a.stockId);
      const units = Math.max(0, Math.round(a.units));
      const gross = unit * units;
      const proceeds = a.stockId === 't_bills' ? Math.round(gross * (1 - T_BILL_SELL_FEE)) : gross;
      return {
        label: `Sell ${units} x ${a.stockId} (+$${proceeds})`,
        hours: 0,
        cost: 0,
        check: () => {
          const here = at('bank');
          if (here) return here;
          if (!c.week.brokerOpen) return 'See the broker first';
          if (units <= 0) return 'Sell at least one unit';
          if ((c.stocks[a.stockId] ?? 0) < units) return 'You do not hold that many';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          c.stocks[a.stockId] = (c.stocks[a.stockId] ?? 0) - units;
          earn(p, proceeds, 'stock sale', deltas);
          deltas.push(d('stocks', -units, a.stockId));
          return { text: `Sold ${units} units of ${a.stockId}.`, deltas };
        },
      };
    }

    case 'rent': {
      const target = a.housingId === 'security_apts' ? 'security_apts' : 'lowcost';
      const price = priceOf(state, CLASSIC_HOUSING[target].baseRent);
      return {
        label: `Move to ${CLASSIC_HOUSING[target].name} ($${price}/month)`,
        hours: 0,
        cost: price,
        check: () => {
          const here = at('rent_office');
          if (here) return here;
          if (!rentOfficeOpen(state, p)) return 'The rent office is shut until rent is due';
          if (c.housing === target) return 'You already live there';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, 'first month', deltas);
          c.housing = target;
          c.rent = price;
          c.rentDueWeek = state.week + 4;
          return { text: `Moved into ${CLASSIC_HOUSING[target].name}.`, deltas };
        },
      };
    }

    case 'payRent': {
      const debt = Math.round(c.rentDebt);
      const amount = debt > 0 ? debt : Math.round(c.rent);
      return {
        label: debt > 0 ? `Pay off $${debt} of back rent` : `Pay a month of rent ($${amount})`,
        hours: 0,
        cost: amount,
        check: () => {
          const here = at('rent_office');
          if (here) return here;
          if (!rentOfficeOpen(state, p)) return 'The rent office is shut until rent is due';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, amount, 'rent', deltas);
          if (debt > 0) {
            c.rentDebt = 0;
            c.rentDueWeek = monthAfter(state.week);
            return { text: 'Cleared your rent debt.', deltas };
          }
          c.rentDueWeek = Math.max(state.week, c.rentDueWeek) + 4;
          c.extensionUntil = 0;
          return { text: `Paid $${amount} of rent; next due week ${c.rentDueWeek}.`, deltas };
        },
      };
    }

    case 'rentExtension':
      return {
        label: 'Ask for a one-week rent extension',
        hours: 0,
        cost: 0,
        check: () => {
          const here = at('rent_office');
          if (here) return here;
          if (state.week < c.rentDueWeek) return 'Your rent is not due yet';
          if (c.week.askedExtension) return 'You have already asked this week';
          if (c.everGarnished) return 'The rent officer will never extend again';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          c.week.askedExtension = true;
          const odds = RENT_EXTENSION_APPROVAL_CHANCE[c.extensionsApproved] ?? RENT_EXTENSION_APPROVAL_FLOOR;
          const ok = playerRoll(state, p, (s) => chance(s, odds));
          if (!ok) {
            happy(p, 'rent_extension_refused', deltas);
            return { text: 'Extension refused.', deltas };
          }
          c.extensionsApproved++;
          c.rentDueWeek = state.week + 1;
          c.extensionUntil = state.week + 1;
          happy(p, 'rent_extension_approved', deltas);
          return { text: 'Extension approved: rent is due next week.', deltas };
        },
      };


    default:
      return null;
  }
}

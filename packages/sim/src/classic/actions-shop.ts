/** Buying things: Socket City, Z-Mart, QT Clothing, Monolith, Black's Market and the Pawn Shop. */
import {
  CLASSIC_CLOTHES,
  CLASSIC_FOODS,
  CLASSIC_HAPPINESS_MAP,
  CLASSIC_ITEMS,
  LOTTERY,
  NEWSPAPER,
  PAWN_FACTOR,
  PAWN_FRIDGE_WITH_FOOD_HAPPINESS,
  PAWN_SHOP_CAPACITY,
  REDEEM_FACTOR,
  REDEEM_WEEKS,
  type ClassicLocationId,
} from '../content/classic';
import type { Action, Delta } from '../types';
import { earn, happy, pay } from './effects';
import { cg, itemBasePrice, type ItemSource } from './state';
import { FRESH_WEEKS, happinessIdForItem, isClosed, priceOf, type Ctx, type Spec } from './context';

/** Every purchase, pawn and redemption. Null if the action is not one of those. */
export function shopSpec(cx: Ctx, a: Action): Spec | string | null {
  const { state, p, c, loc, at } = cx;
  switch (a.type) {
    case 'buyItem': {
      const item = CLASSIC_ITEMS[a.itemId];
      if (!item) return 'No such item';
      const store: ItemSource = loc === 'socket_city' ? 'socket_city' : 'zmart';
      const base = store === 'socket_city' ? item.socketCityPrice : item.zmartPrice;
      const price = base ? priceOf(state, base) : 0;
      return {
        label: `Buy ${item.name} ($${price})`,
        hours: 0,
        cost: price,
        check: () => {
          if (loc !== 'socket_city' && loc !== 'zmart') return isClosed(state, p) ? 'Closed' : 'Socket City or Z-Mart only';
          if (!base) return 'Not sold here';
          if (c.items.includes(item.id)) return 'You already own one';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, item.name, deltas);
          c.items.push(item.id);
          c.itemSource[item.id] = store;
          if (item.category === 'ticket') {
            if (!c.week.ticketsBought.includes(item.id)) {
              c.week.ticketsBought.push(item.id);
              for (const id of happinessIdForItem(item.id, store)) happy(p, id, deltas);
            }
          } else {
            // The table prices the same item differently by store; fall back to the item's own value.
            const id = happinessIdForItem(item.id, store).find((x) => CLASSIC_HAPPINESS_MAP[x]);
            happy(p, id ?? item.id, deltas, id ? undefined : item.happiness);
          }
          return { text: `Bought a ${item.name}.`, deltas };
        },
      };
    }

    case 'buyClothing': {
      const option = CLASSIC_CLOTHES.find((o) => o.tier === a.tier && o.store === a.store);
      if (!option) return 'Not sold here';
      const price = priceOf(state, option.price);
      return {
        label: `Buy ${a.tier} clothes ($${price}, ${option.weeks} weeks)`,
        hours: 0,
        cost: price,
        check: () => at(a.store),
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, `${a.tier} clothes`, deltas);
          c.clothes[a.tier] = (c.clothes[a.tier] ?? 0) + option.weeks;
          if (option.happiness) {
            happy(p, a.tier === 'business' ? 'buy_business_suit' : 'buy_dress_clothes', deltas, option.happiness);
          }
          return { text: `Bought ${option.weeks} weeks of ${a.tier} clothes.`, deltas };
        },
      };
    }

    case 'buyFood': {
      const food = CLASSIC_FOODS[a.foodId];
      if (!food) return 'No such item';
      const where: ClassicLocationId = food.category === 'fresh_food' ? 'blacks_market' : 'monolith';
      const price = priceOf(state, food.price);
      return {
        label: `Buy ${food.name} ($${price})`,
        hours: 0,
        cost: price,
        check: () => at(where),
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, food.name, deltas);
          if (food.category === 'fast_food') {
            c.ateFastFood = true;
            if (!c.week.fastFoodHappiness && food.happiness) {
              c.week.fastFoodHappiness = true;
              happy(p, `buy_${food.id}`, deltas, food.happiness);
            }
          } else if (food.category === 'soft_drink') {
            if (!c.week.softDrinkHappiness && food.happiness) {
              c.week.softDrinkHappiness = true;
              happy(p, `buy_${food.id}`, deltas, food.happiness);
            }
          } else {
            c.freshFood += FRESH_WEEKS[food.id] ?? 1;
            if (!c.week.freshFoodHappiness && food.happiness) {
              c.week.freshFoodHappiness = true;
              happy(p, `buy_${food.id}`, deltas, food.happiness);
            }
          }
          return { text: `Bought ${food.name}.`, deltas };
        },
      };
    }

    case 'lottery':
      return {
        label: `Buy ${LOTTERY.ticketsPerPurchase} lottery tickets ($${LOTTERY.pricePerPurchase})`,
        hours: 0,
        cost: LOTTERY.pricePerPurchase,
        check: () => at('blacks_market'),
        run: () => {
          const deltas: Delta[] = [];
          pay(p, LOTTERY.pricePerPurchase, 'lottery tickets', deltas);
          c.lotteryTickets += LOTTERY.ticketsPerPurchase;
          if (!c.week.lotteryHappiness) {
            c.week.lotteryHappiness = true;
            happy(p, 'buy_lottery_tickets', deltas, LOTTERY.happiness);
          }
          return { text: `Bought ${LOTTERY.ticketsPerPurchase} lottery tickets.`, deltas };
        },
      };

    case 'newspaper':
      return {
        label: `Buy the Daily News ($${NEWSPAPER.price})`,
        hours: NEWSPAPER.hourCost,
        cost: NEWSPAPER.price,
        check: () => at('blacks_market'),
        run: () => {
          const deltas: Delta[] = [];
          pay(p, NEWSPAPER.price, 'newspaper', deltas);
          c.week.readNewspaper = true;
          return { text: `DAILY NEWS: ${cg(state).headline}`, deltas };
        },
      };

    case 'pawnItem': {
      const item = CLASSIC_ITEMS[a.itemId];
      if (!item) return 'No such item';
      const base = itemBasePrice(item.id, c.itemSource[item.id] ?? 'zmart');
      const payout = Math.round(base * PAWN_FACTOR * cg(state).index);
      return {
        label: `Pawn ${item.name} (+$${payout})`,
        hours: 0,
        cost: 0,
        check: () => {
          const here = at('pawn');
          if (here) return here;
          if (!c.items.includes(item.id)) return 'You do not own one';
          if (cg(state).pawnShop.length >= PAWN_SHOP_CAPACITY) return 'The pawn shop is full';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          c.items = c.items.filter((i) => i !== item.id);
          earn(p, payout, 'pawn', deltas);
          cg(state).pawnShop.push({
            itemId: item.id,
            ownerId: p.id,
            basePrice: base,
            pawnedWeek: state.week,
            source: c.itemSource[item.id] ?? 'zmart',
          });
          happy(p, 'item_pawned', deltas);
          if (item.id === 'fridge' && c.freshFood > 0) happy(p, 'fridge_pawned_with_food', deltas, PAWN_FRIDGE_WITH_FOOD_HAPPINESS);
          return { text: `Pawned the ${item.name}.`, deltas };
        },
      };
    }

    case 'redeemItem': {
      const entry = cg(state).pawnShop.find((x) => x.itemId === a.itemId && x.ownerId === p.id);
      const item = CLASSIC_ITEMS[a.itemId];
      if (!item) return 'No such item';
      const price = Math.round((entry?.basePrice ?? 0) * REDEEM_FACTOR);
      return {
        label: `Redeem ${item.name} ($${price})`,
        hours: 0,
        cost: price,
        check: () => {
          const here = at('pawn');
          if (here) return here;
          if (!entry) return 'Not yours to redeem';
          if (state.week - entry.pawnedWeek >= REDEEM_WEEKS) return 'The redemption window has closed';
          if (c.items.includes(item.id)) return 'You already own one';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, 'redeem', deltas);
          const shop = cg(state);
          shop.pawnShop = shop.pawnShop.filter((x) => x !== entry);
          c.items.push(item.id);
          c.itemSource[item.id] = entry!.source;
          return { text: `Redeemed the ${item.name}.`, deltas };
        },
      };
    }

    case 'buyPawned': {
      const entry = cg(state).pawnShop.find((x) => x.itemId === a.itemId);
      const item = CLASSIC_ITEMS[a.itemId];
      if (!item) return 'No such item';
      const price = Math.round((entry?.basePrice ?? 0) * REDEEM_FACTOR);
      return {
        label: `Buy ${item.name} from the pawn shop ($${price})`,
        hours: 0,
        cost: price,
        check: () => {
          const here = at('pawn');
          if (here) return here;
          if (!entry) return 'Not for sale';
          if (entry.ownerId === p.id && state.week - entry.pawnedWeek < REDEEM_WEEKS) return 'Redeem it instead';
          if (entry.ownerId !== p.id && state.week - entry.pawnedWeek < REDEEM_WEEKS) return 'Still in its redemption window';
          if (c.items.includes(item.id)) return 'You already own one';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, price, item.name, deltas);
          const shop = cg(state);
          shop.pawnShop = shop.pawnShop.filter((x) => x !== entry);
          c.items.push(item.id);
          c.itemSource[item.id] = 'pawn_shop';
          return { text: `Bought the ${item.name} at the pawn shop.`, deltas };
        },
      };
    }


    default:
      return null;
  }
}

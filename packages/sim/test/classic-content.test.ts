import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../src/content/locations';
import type { ClassicDegreeId } from '../src/content/classic';
import {
  CLASSIC_LOCATIONS,
  CLASSIC_LOCATION_LIST,
  CLASSIC_JOBS,
  CLASSIC_JOB_LIST,
  CLASSIC_DEGREES,
  CLASSIC_DEGREE_LIST,
  jobsRequiringDegree,
  CLASSIC_ITEMS,
  CLASSIC_ITEM_LIST,
  CLASSIC_CLOTHES,
  CLASSIC_FOODS,
  CLASSIC_FOOD_LIST,
  CLASSIC_HOUSING,
  CLASSIC_HOUSING_LIST,
  CLASSIC_STOCKS,
  CLASSIC_STOCK_LIST,
  CLASSIC_HAPPINESS,
  CLASSIC_ACTION_TIMES,
  RANDOM_WEEKENDS,
  FLOPPY_ONLY_WEEKENDS,
  DURABLE_WEEKENDS,
  TICKET_WEEKENDS,
  RANDOM_HEADLINES,
  SPECIFIC_HEADLINES,
  loanLiquidity,
  loanRiskFactor,
  loanSize,
  maxDependability,
  minDependability,
  applicationLuck,
} from '../src/content/classic';

describe('classic locations', () => {
  it('has exactly the 13 classic locations', () => {
    expect(CLASSIC_LOCATION_LIST).toHaveLength(13);
  });

  it('every classic location id matches an id in the sim LOCATIONS table', () => {
    for (const loc of CLASSIC_LOCATION_LIST) {
      expect(LOCATIONS[loc.id], `missing sim location for ${loc.id}`).toBeDefined();
    }
  });

  it('every location with a role in Rent Office quotes has an opening-hours string', () => {
    for (const loc of CLASSIC_LOCATION_LIST) {
      expect(typeof loc.openingHours).toBe('string');
      expect(loc.openingHours.length).toBeGreaterThan(0);
    }
  });
});

describe('classic jobs', () => {
  it('has exactly the 39 jobs from the List of Jobs', () => {
    expect(CLASSIC_JOB_LIST).toHaveLength(39);
  });

  it('every job employer exists as a classic location', () => {
    for (const job of CLASSIC_JOB_LIST) {
      expect(CLASSIC_LOCATIONS[job.employer], `missing employer ${job.employer} for ${job.id}`).toBeDefined();
    }
  });

  it('every job degree requirement exists as a classic degree', () => {
    for (const job of CLASSIC_JOB_LIST) {
      for (const d of job.degrees) {
        expect(CLASSIC_DEGREES[d], `missing degree ${d} for job ${job.id}`).toBeDefined();
      }
    }
  });

  it('wage, experience and dependability are non-negative numbers for every job', () => {
    for (const job of CLASSIC_JOB_LIST) {
      expect(job.wage).toBeGreaterThan(0);
      expect(job.experience).toBeGreaterThanOrEqual(0);
      expect(job.dependability).toBeGreaterThanOrEqual(0);
    }
  });

  it('flags exactly the two CD-ROM-only jobs and the one always-hired job', () => {
    const cdRomOnly = CLASSIC_JOB_LIST.filter((j) => j.cdRomOnly);
    const alwaysHired = CLASSIC_JOB_LIST.filter((j) => j.alwaysHired);
    expect(cdRomOnly.map((j) => j.id).sort()).toEqual(['qt_janitor', 'socket_clerk']);
    expect(alwaysHired.map((j) => j.id)).toEqual(['monolith_cook']);
  });

  it('has no duplicate job ids', () => {
    const ids = CLASSIC_JOB_LIST.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('classic degrees', () => {
  it('has exactly the 11 degrees', () => {
    expect(CLASSIC_DEGREE_LIST).toHaveLength(11);
  });

  it('every prereq points to an existing degree', () => {
    for (const d of CLASSIC_DEGREE_LIST) {
      if (d.prereq) expect(CLASSIC_DEGREES[d.prereq], `missing prereq ${d.prereq} for ${d.id}`).toBeDefined();
    }
  });

  it('junior_college and trade_school have no prerequisite; every other degree does', () => {
    expect(CLASSIC_DEGREES.junior_college.prereq).toBeNull();
    expect(CLASSIC_DEGREES.trade_school.prereq).toBeNull();
    const withPrereq = CLASSIC_DEGREE_LIST.filter((d) => d.id !== 'junior_college' && d.id !== 'trade_school');
    for (const d of withPrereq) expect(d.prereq).not.toBeNull();
  });

  it('jobsRequiringDegree returns jobs that really list the degree', () => {
    const forJuniorCollege = jobsRequiringDegree('junior_college');
    expect(forJuniorCollege.length).toBeGreaterThan(0);
    for (const j of forJuniorCollege) expect(j.degrees).toContain('junior_college');
    // graduate_school and post_doctoral are bridge degrees required by no job
    expect(jobsRequiringDegree('graduate_school')).toHaveLength(0);
    expect(jobsRequiringDegree('post_doctoral')).toHaveLength(0);
    expect(jobsRequiringDegree('publishing')).toHaveLength(0);
  });

  it('the degree chain resolves to Publishing in <= 11 steps with no cycles', () => {
    for (const d of CLASSIC_DEGREE_LIST) {
      const seen = new Set<string>();
      let cur: ClassicDegreeId | null = d.id;
      while (cur) {
        expect(seen.has(cur), `cycle detected at ${cur}`).toBe(false);
        seen.add(cur);
        cur = CLASSIC_DEGREES[cur]!.prereq;
      }
      expect(seen.size).toBeLessThanOrEqual(11);
    }
  });
});

describe('classic items', () => {
  it('has the 10 appliances + 3 books + 3 tickets + 3 junk items (19 total)', () => {
    expect(CLASSIC_ITEM_LIST).toHaveLength(19);
  });

  it('every item has at least one store price', () => {
    for (const item of CLASSIC_ITEM_LIST) {
      expect(item.socketCityPrice !== undefined || item.zmartPrice !== undefined, `${item.id} has no price`).toBe(true);
      if (item.socketCityPrice !== undefined) expect(item.socketCityPrice).toBeGreaterThan(0);
      if (item.zmartPrice !== undefined) expect(item.zmartPrice).toBeGreaterThan(0);
    }
  });

  it('exempts exactly the 7 items the dedicated Wild Willy Exceptions section lists', () => {
    const exempt = CLASSIC_ITEM_LIST.filter((i) => i.wildWillyExempt).map((i) => i.id).sort();
    expect(exempt).toEqual(['atlas', 'computer', 'dictionary', 'encyclopedia', 'freezer', 'fridge', 'stove']);
  });
});

describe('classic clothes', () => {
  it('has 3 QT Clothing tiers and 2 Z-Mart tiers (no Z-Mart business suit)', () => {
    const qt = CLASSIC_CLOTHES.filter((c) => c.store === 'qt_clothing');
    const zmart = CLASSIC_CLOTHES.filter((c) => c.store === 'zmart');
    expect(qt).toHaveLength(3);
    expect(zmart).toHaveLength(2);
    expect(zmart.find((c) => c.tier === 'business')).toBeUndefined();
  });

  it('every option has a positive price and weeks value', () => {
    for (const c of CLASSIC_CLOTHES) {
      expect(c.price).toBeGreaterThan(0);
      expect(c.weeks).toBeGreaterThan(0);
    }
  });
});

describe('classic food', () => {
  it('has 4 fast food + 2 soft drinks + 3 fresh food entries (9 total)', () => {
    expect(CLASSIC_FOOD_LIST).toHaveLength(9);
  });

  it('every food item has a positive price', () => {
    for (const f of CLASSIC_FOOD_LIST) expect(f.price).toBeGreaterThan(0);
  });
});

describe('classic housing', () => {
  it('has the 2 classic apartments with positive base rent', () => {
    expect(CLASSIC_HOUSING_LIST).toHaveLength(2);
    for (const h of CLASSIC_HOUSING_LIST) expect(h.baseRent).toBeGreaterThan(0);
  });

  it('every housing id exists as a classic location', () => {
    for (const h of CLASSIC_HOUSING_LIST) expect(CLASSIC_LOCATIONS[h.id]).toBeDefined();
  });
});

describe('classic bank', () => {
  it('has the 6 stocks, all with a positive base price', () => {
    expect(CLASSIC_STOCK_LIST).toHaveLength(6);
    for (const s of CLASSIC_STOCK_LIST) expect(s.basePrice).toBeGreaterThan(0);
  });

  it('only T-Bills lack a min/max fluctuation range', () => {
    const noRange = CLASSIC_STOCK_LIST.filter((s) => s.minPrice === undefined);
    expect(noRange.map((s) => s.id)).toEqual(['t_bills']);
  });

  it('loanLiquidity, loanRiskFactor and loanSize compute the documented formulas', () => {
    expect(loanLiquidity(10, 2000)).toBeCloseTo(12);
    expect(loanRiskFactor(0, 0, false)).toBe(5);
    expect(loanRiskFactor(2, 300, true)).toBe(5 + 2 + 3 + 1);
    expect(loanSize(12, 5)).toBe(700);
  });
});

describe('classic happiness table', () => {
  it('has no duplicate ids', () => {
    const ids = CLASSIC_HAPPINESS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a non-zero amount (or non-zero range)', () => {
    for (const h of CLASSIC_HAPPINESS) {
      if (Array.isArray(h.amount)) {
        expect(h.amount[0]).not.toBe(0);
        expect(h.amount[1]).not.toBe(0);
      } else {
        expect(h.amount).not.toBe(0);
      }
    }
  });

  it('has more increasing than decreasing purchase entries is not asserted; instead check both directions exist', () => {
    const positive = CLASSIC_HAPPINESS.filter((h) => (Array.isArray(h.amount) ? h.amount[0] > 0 : h.amount > 0));
    const negative = CLASSIC_HAPPINESS.filter((h) => (Array.isArray(h.amount) ? h.amount[0] < 0 : h.amount < 0));
    expect(positive.length).toBeGreaterThan(0);
    expect(negative.length).toBeGreaterThan(0);
  });
});

describe('classic time', () => {
  it('every action time is a non-negative number of hours', () => {
    for (const a of CLASSIC_ACTION_TIMES) expect(a.hours).toBeGreaterThanOrEqual(0);
  });

  it('has no duplicate action ids', () => {
    const ids = CLASSIC_ACTION_TIMES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('work, relax and a lesson each cost 6 hours; apply/raise/broker/loan cost 2-4', () => {
    const byId = Object.fromEntries(CLASSIC_ACTION_TIMES.map((a) => [a.id, a.hours]));
    expect(byId.work).toBe(6);
    expect(byId.relax).toBe(6);
    expect(byId.lesson).toBe(6);
    expect(byId.apply).toBe(4);
    expect(byId.raise).toBe(4);
    expect(byId.loan_apply).toBe(2);
    expect(byId.broker_access).toBe(2);
    expect(byId.newspaper).toBe(1);
  });
});

describe('classic weekend texts', () => {
  it('has exactly 42 CD-ROM random weekends and 2 floppy-only extras', () => {
    expect(RANDOM_WEEKENDS).toHaveLength(42);
    expect(FLOPPY_ONLY_WEEKENDS).toHaveLength(2);
  });

  it('has 13 durable-specific and 3 ticket-specific weekends', () => {
    expect(DURABLE_WEEKENDS).toHaveLength(13);
    expect(TICKET_WEEKENDS).toHaveLength(3);
  });

  it('random weekend numbers run 1..42 with no gaps or duplicates', () => {
    const ns = RANDOM_WEEKENDS.map((w) => w.n).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it('every weekend text is non-empty', () => {
    for (const w of [...RANDOM_WEEKENDS, ...FLOPPY_ONLY_WEEKENDS, ...DURABLE_WEEKENDS, ...TICKET_WEEKENDS]) {
      expect(w.text.length).toBeGreaterThan(0);
    }
  });

  it('every durable weekend references an item that exists in items.ts', () => {
    for (const w of DURABLE_WEEKENDS) {
      expect(CLASSIC_ITEMS[w.itemId], `missing item ${w.itemId} for durable weekend`).toBeDefined();
    }
  });
});

describe('classic economy / newspaper', () => {
  it('has 6 specific-event headlines and 39 random headlines', () => {
    expect(Object.keys(SPECIFIC_HEADLINES)).toHaveLength(6);
    expect(RANDOM_HEADLINES).toHaveLength(39);
  });

  it('has no duplicate random headlines', () => {
    expect(new Set(RANDOM_HEADLINES).size).toBe(RANDOM_HEADLINES.length);
  });
});

describe('classic goals formulas', () => {
  it('maxDependability and minDependability match the documented formulas', () => {
    expect(maxDependability(30, 2)).toBe(20 + 30 + 10);
    expect(minDependability(30)).toBe(25);
  });

  it('applicationLuck matches the documented formula', () => {
    // Luck = 30 + (10 + Dependability + Experience + 8*DegreeCount) / 3
    expect(applicationLuck(20, 0, 0)).toBeCloseTo(30 + 30 / 3);
  });
});

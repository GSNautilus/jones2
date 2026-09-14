/** Tunable constants. Balance work edits this file, not logic. */

export const HOURS_PER_WEEK = 60;
export const WEEK_MINUTES = HOURS_PER_WEEK * 60;

/** Budget = WEEK_MINUTES * (floor + (1 - floor) * health / 100). */
export const HEALTH_BUDGET_FLOOR = 0.7;
export const SICK_THRESHOLD = 25;
export const SICK_PENALTY_MINUTES = 8 * 60;

export const START_CASH = 300;
export const START_HAPPINESS = 50;
export const START_HEALTH = 70;

export const MEALS_REQUIRED = 5;
export const MISSED_MEAL_HEALTH = -6;
export const MISSED_MEAL_HAPPINESS = -3;
export const HEALTH_WEEKLY_DRIFT = -3;
export const HAPPINESS_WEEKLY_DECAY = -4;
export const NO_HOME_HAPPINESS = -8;

export const CLOTHING_WEEKLY_WEAR = -8;
export const CLOTHING_WORK_WEAR = -1; // per shift
export const CLOTHING_SHABBY = 40;
export const CLOTHING_PRICES = [0, 60, 180, 450];

export const MAX_SHIFTS_PER_WEEK = 6;
/** Minutes worked beyond this per week cost happiness. */
export const OVERWORK_MINUTES = 40 * 60;
export const OVERWORK_HAPPINESS_PER_HOUR = -1;

/** Repeated leisure/exercise in one week: nth act is worth this^(n-1). */
export const DIMINISH = 0.7;

/** Weekly comfort happiness = COMFORT_MAX * c / (c + COMFORT_HALF). */
export const COMFORT_MAX = 12;
export const COMFORT_HALF = 8;

/** Fulfilment: weekly happiness from holding a job, by rung (index 0 = unemployed). */
export const FULFILMENT_BY_RUNG = [-2, 0, 1, 3, 5];

export const DEBT_STRESS_PER_1000 = -2;
export const LOW_HEALTH_STRESS = -4; // when health < 40

export const RELAX_HAPPINESS_PER_HOUR = 1.5;
export const RELAX_MAX_HOURS_PER_WEEK = 10;

export const INTERVIEW_MINUTES = 60;
export const QUIT_HAPPINESS = -3;
export const LAYOFF_HAPPINESS = -10;
export const PROMOTION_HAPPINESS = 8;

export const LOAN_LIMIT = 2500;
export const BANK_MINUTES = 20;
export const SHOP_MINUTES = 30;
export const CLOTHES_MINUTES = 45;

export const GROCERY_CAPACITY = 2;
export const GROCERY_CAPACITY_FRIDGE = 6;
export const COOK_MINUTES = 45;
export const COOK_MINUTES_MICROWAVE = 25;

export const HOME_STUDY_FACTOR = 1.5;
export const HOME_STUDY_TUITION_FACTOR = 0.5;
export const OFFICE_STUDY_FACTOR = 0.8;

export const CLINIC_PRICE = 80;
export const CLINIC_MINUTES = 90;
export const CLINIC_HEALTH = 20;

export const BUS_PASS_PRICE = 25;
export const BUS_PASS_WEEKS = 4;
export const INSURANCE_PRICE = 30;
export const INSURANCE_WEEKS = 4;
export const CAR_WEEKLY_COST = 40;

export const LOTTERY_TICKET = 5;
export const LOTTERY_ODDS = 0.02;
export const LOTTERY_PRIZE = 1000;

export const THEFT_MAX_ITEMS = 1;

export const ECONOMY_DEFAULTS = {
  priceIndex: 1,
  wageIndex: 1,
  rentIndex: 1,
  savingsRate: 0.01,
  loanRate: 0.03,
  crimeRate: 0.15,
};

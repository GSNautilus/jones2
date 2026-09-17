/**
 * The four goals' formulas and the Dependability rules that drive the Career goal. Source:
 * "# Goals" (35-83), "# Wealth Goal" (86-157), "# Happiness Goal" (160-190, stat only), "# Career
 * Goal" (303-347), "# Education Goal" (351-393), "# Dependability" (1934-2374), "# Employment
 * Office" > "## No Openings" / "## Asking for a Raise" (1827-1900).
 */

export const GOAL_MIN = 10;
export const GOAL_MAX = 100;

/** Wealth Goal = Liquid Assets / 100. Liquid Assets = Cash + Bank + total Stock value (items excluded, loan debt counts negative). */
export const LIQUID_ASSETS_PER_POINT = 100;

/** Happiness Goal is compared directly against the Happiness stat — no formula/scaling. */
export const HAPPINESS_GOAL_IS_STAT = true;

/** Education Goal = 1 + 9 * degree count. 11 degrees * 9 + 1 = 100 at every degree earned. */
export const EDUCATION_BASE = 1;
export const EDUCATION_PER_DEGREE = 9;

/** Career Goal = 1.25 * Dependability while employed; 0 while unemployed (even if Dependability is high). */
export const CAREER_DEPENDABILITY_MULTIPLIER = 1.25;
export const CAREER_UNEMPLOYED_VALUE = 0;

// --- Dependability ("# Dependability") ---
export const DEPENDABILITY_START = 20;
/** Lost at the start of every Turn, floor 0. "## Dependibility Stat" (1980-1986). */
export const DEPENDABILITY_WEEKLY_DECAY = 3;
/** Gained per successful (paid) work session, capped at the job's Maximum Dependability. "## Increasing Dependibility" (2004-2016). */
export const DEPENDABILITY_PER_WORK_SESSION = 1;
/** If Dependability is below this when a new Job is granted, it resets up to this value. "## Required Dependibility" (2000-2002). */
export const DEPENDABILITY_NEW_JOB_FLOOR = 10;
/**
 * Anti-frustration rule: a job listing "Required Dependability" of 10 actually requires 0 to
 * hire. "## Required Dependibility" (1996-1998).
 */
export const DEPENDABILITY_TEN_IS_ZERO = 10;
/** Temporary bonus on graduating any degree; can push Dependability above its cap. "### Dependibility" (2495-2515). */
export const DEPENDABILITY_DEGREE_BONUS = 5;

/** Maximum Dependability = 20 + job's Required Dependability + 5 * degree count. "## Maximum Dependibility" (2026-2194). */
export function maxDependability(requiredDependability: number, degreeCount: number): number {
  return 20 + requiredDependability + 5 * degreeCount;
}

/**
 * Minimum Dependability to avoid being fired = job's Required Dependability - 5.
 * Below this: fired on the next Work attempt. 3-5 points below Required (i.e. still >= Minimum):
 * only a warning. "## Minimum Dependibility" (2196-2211).
 */
export function minDependability(requiredDependability: number): number {
  return requiredDependability - 5;
}
export const DEPENDABILITY_WARNING_BAND = { min: 3, max: 5 } as const;

/** Raise requires Dependability >= Required + 5 * raisesAlreadyReceivedAtThisJob. Counter resets on switching jobs. "## Getting a Raise" (2212-2358). */
export function raiseDependabilityThreshold(requiredDependability: number, raisesAlready: number): number {
  return requiredDependability + 5 * raisesAlready;
}

/**
 * "No Openings" luck score: 30 + (10 + Dependability + Experience + 8*DegreeCount) / 3.
 * "## No Openings" (1837-1873). The wiki never states whether the random 1-100 roll needs to be
 * <= or < luck to succeed — left unspecified (ambiguous in the source), for the ruleset author
 * to decide.
 */
export function applicationLuck(dependability: number, experience: number, degreeCount: number): number {
  return 30 + (10 + dependability + experience + 8 * degreeCount) / 3;
}
export const APPLICATION_LUCK_ROLL_MAX = 100;
export const APPLICATION_LUCK_COMPARISON_DOCUMENTED = false;

/** Applying for the Monolith Cook job is always approved, no matter the applicant's stats — see jobs.ts CLASSIC_JOBS.monolith_cook.alwaysHired. */
export const COOK_JOB_ALWAYS_APPROVED = true;

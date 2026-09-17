import type { ClassicClothingTier, ClassicDegreeId, ClassicJobId, ClassicLocationId } from './ids';

/**
 * The full "List of Jobs". Source: original-rules.md "# List of Jobs" (1684-1731), cross-checked
 * against each employer's own "## Jobs" table ("# Rent Office" 929-933, "# Employment Office" is
 * the applying-UI not a job list, "# Hi-Tech U" 2717-2720, "# QT Clothing" 3067-3073, "# Z-Mart"
 * 3307-3312, "# Socket City" 3506-3512, "# Black's Market" 4015-4022, "# Monolith Burgers"
 * 4260-4266, "# Factory" 6475-6486, "# Bank" 5400-5407). All nine per-employer tables agree with
 * "List of Jobs" exactly, so there was nothing to reconcile beyond matching row order.
 *
 * Uniform tiers come from "List of Jobs"'s own Uniform column (also cross-checked against
 * "# Uniform" / "## List of Uniforms", original-rules.md:2925-2991, whose table itself lost its
 * per-job Casual/Dress/Business columns to markdown extraction — "List of Jobs" is the usable
 * source).
 */
export interface ClassicJob {
  id: ClassicJobId;
  title: string;
  employer: ClassicLocationId;
  /** Dollars/hour before the economy's wage index. */
  wage: number;
  /** Required Experience stat. */
  experience: number;
  /** Required Dependability stat. Note: a listed value of 10 is actually 0 to hire — see goals.ts DEPENDABILITY_TEN_IS_ZERO. */
  dependability: number;
  degrees: ClassicDegreeId[];
  uniform: ClassicClothingTier;
  /** Only available in the CD-ROM version (marked '*' in the wiki). */
  cdRomOnly?: boolean;
  /** The Monolith Cook job (marked '**'): always hired, no matter the applicant's stats. */
  alwaysHired?: boolean;
}

function job(
  id: ClassicJobId,
  title: string,
  employer: ClassicLocationId,
  wage: number,
  experience: number,
  dependability: number,
  uniform: ClassicClothingTier,
  opts: Partial<Pick<ClassicJob, 'degrees' | 'cdRomOnly' | 'alwaysHired'>> = {},
): ClassicJob {
  return { id, title, employer, wage, experience, dependability, uniform, degrees: opts.degrees ?? [], cdRomOnly: opts.cdRomOnly, alwaysHired: opts.alwaysHired };
}

export const CLASSIC_JOBS: Record<ClassicJobId, ClassicJob> = Object.fromEntries(
  [
    // Z-Mart (original-rules.md:1688-1690, 3309-3312)
    job('zmart_clerk', 'Clerk', 'zmart', 5, 10, 10, 'casual'),
    job('zmart_assistant_manager', 'Assistant Manager', 'zmart', 7, 20, 20, 'dress'),
    job('zmart_manager', 'Manager', 'zmart', 8, 30, 30, 'business', { degrees: ['junior_college'] }),

    // Monolith Burgers (original-rules.md:1691-1694, 4262-4266)
    job('monolith_cook', 'Cook', 'monolith', 5, 0, 10, 'casual', { alwaysHired: true }),
    job('monolith_clerk', 'Clerk', 'monolith', 6, 10, 20, 'casual'),
    job('monolith_assistant_manager', 'Assistant Manager', 'monolith', 7, 20, 30, 'casual'),
    job('monolith_manager', 'Manager', 'monolith', 8, 30, 40, 'dress', { degrees: ['junior_college'] }),

    // QT Clothing (original-rules.md:1695-1698, 3069-3073)
    job('qt_janitor', 'Janitor', 'qt_clothing', 6, 10, 20, 'casual', { cdRomOnly: true }),
    job('qt_salesperson', 'Salesperson', 'qt_clothing', 8, 30, 30, 'dress'),
    job('qt_assistant_manager', 'Assistant Manager', 'qt_clothing', 9, 40, 40, 'business', { degrees: ['junior_college'] }),
    job('qt_manager', 'Manager', 'qt_clothing', 12, 50, 50, 'business', { degrees: ['business_admin'] }),

    // Socket City (original-rules.md:1699-1702, 3508-3512)
    job('socket_clerk', 'Clerk', 'socket_city', 6, 10, 20, 'casual', { cdRomOnly: true }),
    job('socket_salesperson', 'Salesperson', 'socket_city', 7, 30, 30, 'dress'),
    job('socket_electronics_repairman', 'Electronics Repairman', 'socket_city', 11, 40, 40, 'casual', { degrees: ['electronics'] }),
    job('socket_manager', 'Manager', 'socket_city', 14, 40, 40, 'business', { degrees: ['electronics', 'junior_college'] }),

    // Hi-Tech U (original-rules.md:1703-1705, 2717-2720)
    job('university_janitor', 'Janitor', 'university', 5, 10, 10, 'casual'),
    job('university_teacher', 'Teacher', 'university', 11, 40, 50, 'dress', { degrees: ['academic'] }),
    job('university_professor', 'Professor', 'university', 20, 50, 60, 'dress', { degrees: ['research'] }),

    // Factory (original-rules.md:1706-1714, 6477-6486)
    job('factory_janitor', 'Janitor', 'factory', 7, 10, 20, 'casual'),
    job('factory_assembly_worker', 'Assembly Worker', 'factory', 8, 30, 30, 'casual', { degrees: ['trade_school'] }),
    job('factory_secretary', 'Secretary', 'factory', 9, 40, 40, 'dress', { degrees: ['junior_college'] }),
    job('factory_machinists_helper', "Machinist's Helper", 'factory', 10, 40, 40, 'casual', { degrees: ['pre_engineering'] }),
    job('factory_executive_secretary', 'Executive Secretary', 'factory', 18, 50, 50, 'business', { degrees: ['business_admin'] }),
    job('factory_machinist', 'Machinist', 'factory', 19, 50, 50, 'casual', { degrees: ['engineering'] }),
    job('factory_department_manager', 'Department Manager', 'factory', 22, 60, 60, 'business', { degrees: ['junior_college', 'engineering'] }),
    job('factory_engineer', 'Engineer', 'factory', 23, 60, 60, 'business', { degrees: ['junior_college', 'engineering'] }),
    job('factory_general_manager', 'General Manager', 'factory', 25, 70, 70, 'business', { degrees: ['business_admin', 'engineering'] }),

    // Bank (original-rules.md:1715-1719, 5402-5407)
    job('bank_janitor', 'Janitor', 'bank', 6, 10, 20, 'casual'),
    job('bank_teller', 'Teller', 'bank', 10, 40, 40, 'dress', { degrees: ['junior_college'] }),
    job('bank_assistant_manager', 'Assistant Manager', 'bank', 14, 50, 50, 'business', { degrees: ['business_admin'] }),
    job('bank_manager', 'Manager', 'bank', 19, 60, 60, 'business', { degrees: ['business_admin'] }),
    job('bank_broker', 'Broker', 'bank', 22, 70, 70, 'business', { degrees: ['business_admin', 'academic'] }),

    // Black's Market (original-rules.md:1720-1724, 4017-4022)
    job('blacks_janitor', 'Janitor', 'blacks_market', 6, 10, 10, 'casual'),
    job('blacks_checker', 'Checker', 'blacks_market', 8, 20, 20, 'casual'),
    job('blacks_butcher', 'Butcher', 'blacks_market', 12, 30, 30, 'casual', { degrees: ['trade_school'] }),
    job('blacks_assistant_manager', 'Assistant Manager', 'blacks_market', 15, 40, 40, 'dress', { degrees: ['junior_college'] }),
    job('blacks_manager', 'Manager', 'blacks_market', 18, 50, 50, 'business', { degrees: ['business_admin'] }),

    // Rent Office (original-rules.md:1725-1726, 931-933)
    job('rent_groundskeeper', 'Groundskeeper', 'rent_office', 7, 10, 20, 'casual'),
    job('rent_apartment_manager', 'Apartment Manager', 'rent_office', 9, 30, 30, 'casual', { degrees: ['junior_college'] }),
  ].map((j) => [j.id, j]),
);

export const CLASSIC_JOB_LIST: ClassicJob[] = Object.values(CLASSIC_JOBS);

/** Work session length and pay, from "# Jobs" > "## Working" / "## Wages" (original-rules.md:1472-1527). */
export const WORK_SESSION_HOURS = 6;
/** Money earned = wage * WORK_SESSION_WAGE_MULTIPLIER * (hoursRemaining / WORK_SESSION_HOURS), capped at a full session. */
export const WORK_SESSION_WAGE_MULTIPLIER = 8;

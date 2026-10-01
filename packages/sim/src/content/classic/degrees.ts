import type { ClassicDegreeId } from './ids';
import { CLASSIC_JOB_LIST, type ClassicJob } from './jobs';

/**
 * The 11 degrees. Source: original-rules.md "# Degrees" (2379-2399) and "## List of Degrees"
 * (2401-2436).
 *
 * CONTRADICTION: docs/PLAN.md §0 summarises the tree as "Trade School -> Business Admin", but
 * the wiki's own "List of Degrees" table (the more specific source) prerequisites Business
 * Administration on Junior College, not Trade School. Followed the table.
 *
 * The task brief asked for "cost per lesson", but the wiki has no such thing: Hi-Tech U charges
 * a one-time Enrollment Fee per *course* (not per lesson), and each of the 10 lessons only costs
 * time (6 Hours), no money. See ENROLLMENT_FEE_BASE below and "# Hi-Tech U" > "## Enrolling"
 * (original-rules.md:2590-2612).
 */
export interface ClassicDegree {
  id: ClassicDegreeId;
  name: string;
  /** Degree that must be held before this one can be studied. null = always available. */
  prereq: ClassicDegreeId | null;
}

export const CLASSIC_DEGREES: Record<ClassicDegreeId, ClassicDegree> = {
  junior_college: { id: 'junior_college', name: 'Junior College', prereq: null },
  trade_school: { id: 'trade_school', name: 'Trade School', prereq: null },
  business_admin: { id: 'business_admin', name: 'Business Administration', prereq: 'junior_college' },
  academic: { id: 'academic', name: 'Academic', prereq: 'junior_college' },
  electronics: { id: 'electronics', name: 'Electronics', prereq: 'trade_school' },
  pre_engineering: { id: 'pre_engineering', name: 'Pre-Engineering', prereq: 'trade_school' },
  graduate_school: { id: 'graduate_school', name: 'Graduate School', prereq: 'academic' },
  engineering: { id: 'engineering', name: 'Engineering', prereq: 'pre_engineering' },
  post_doctoral: { id: 'post_doctoral', name: 'Post-Doctoral', prereq: 'graduate_school' },
  research: { id: 'research', name: 'Research', prereq: 'post_doctoral' },
  publishing: { id: 'publishing', name: 'Publishing', prereq: 'research' },
};

export const CLASSIC_DEGREE_LIST: ClassicDegree[] = Object.values(CLASSIC_DEGREES);

/** "## Studying" (original-rules.md:2614-2636). */
export const LESSONS_PER_DEGREE = 10;
/** Owning a Computer AND (Encyclopedia+Dictionary+Atlas) each shave 1 lesson; floor at 8. "### Extra Credit" (2638-2668). */
export const MIN_LESSONS_WITH_EXTRA_CREDIT = 8;
/** One-time fee to unlock a course slot, adjusted by the economy. "## Enrolling" (2590-2612). */
export const ENROLLMENT_FEE_BASE = 50;
/** "Players may enroll in up to 4 courses simultaneously." "# Hi-Tech U" (2569-2571). */
export const MAX_ACTIVE_COURSES = 4;
/** Time cost of a single lesson (also the max useful study session). "## Studying" (2630-2634). */
export const LESSON_HOURS = 6;
/** A course may run up to this many Hours in total before completion is guaranteed by lesson count. (2569-2571) */
export const MAX_COURSE_HOURS = 60;

/** Every job (from jobs.ts) that lists this degree as a requirement. Derived, not hand-duplicated. */
export function jobsRequiringDegree(id: ClassicDegreeId): ClassicJob[] {
  return CLASSIC_JOB_LIST.filter((j) => j.degrees.includes(id));
}

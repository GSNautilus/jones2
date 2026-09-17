/**
 * Getting around, working, hiring, studying and relaxing. Two of these follow the wiki's "needs
 * at least 1 Hour to start" rule rather than needing their full cost: a Work session pays pro
 * rata, and a University lesson takes whatever is left with no penalty.
 */
import { routeHours } from '@jones2/town';
import {
  APPLICATION_LUCK_ROLL_MAX,
  CLASSIC_JOBS,
  CLASSIC_LOCATIONS,
  DEPENDABILITY_DEGREE_BONUS,
  DEPENDABILITY_NEW_JOB_FLOOR,
  DEPENDABILITY_PER_WORK_SESSION,
  ENROLLMENT_FEE_BASE,
  LESSON_HOURS,
  RELAXATION,
  RENT_DEBT_GARNISH_FRACTION,
  RENT_DEBT_INTEREST_FEE,
  WORK_SESSION_HOURS,
  WORK_SESSION_WAGE_MULTIPLIER,
  applicationLuck,
  minDependability,
  raiseDependabilityThreshold,
} from '../content/classic';
import { nextInt } from '../rng';
import type { Action, Delta } from '../types';
import * as K from './config';
import { d, earn, happy, pay } from './effects';
import { degreeCount, hasUniform, jobOf, lessonsNeeded, maxDep, maxExp } from './state';
import { DEGREE_BY_ID, MINUTES, listedWage, monthAfter, priceOf, requiredDep, type Ctx, type Spec } from './context';

/** Travel, work, apply, raise, enrol, lesson, relax, end the week. Null if not one of those. */
export function jobSpec(cx: Ctx, a: Action): Spec | string | null {
  const { state, p, c, graph, at } = cx;
  switch (a.type) {
    case 'travel': {
      if (!graph.hasNode(a.to)) return 'Unknown destination';
      const route = graph.bestRoute(p.node, a.to, ['walk']);
      if (!route) return 'No route';
      const name = graph.node(a.to).name ?? a.to;
      const hours = routeHours(route.minutes);
      return {
        label: `Go to ${name} (${hours}h)`,
        hours,
        cost: 0,
        duration: route.minutes,
        check: () => (a.to === p.node ? 'Already here' : null),
        run: () => {
          p.node = a.to;
          if (!p.visited.includes(a.to)) p.visited.push(a.to);
          return { text: `Walked to ${name}`, deltas: [], path: route.path };
        },
      };
    }

    case 'work': {
      const job = jobOf(p);
      if (!job) return 'You have no job';
      const fired = c.dependability < minDependability(requiredDep(job.dependability));
      const hoursLeft = Math.floor(p.minutesLeft / MINUTES);
      const hours = fired ? 0 : Math.min(WORK_SESSION_HOURS, Math.max(1, hoursLeft));
      const gross = Math.round((c.wage * WORK_SESSION_WAGE_MULTIPLIER * hours) / WORK_SESSION_HOURS);
      return {
        label: `Work a session as ${job.title} ($${gross})`,
        hours,
        cost: 0,
        partial: !fired,
        check: () => {
          const here = at(job.employer);
          if (here) return here;
          if (!hasUniform(p, job.uniform)) return `Needs ${job.uniform} clothes`;
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          if (fired) {
            c.jobId = null;
            c.wage = 0;
            c.raises = 0;
            state.jobHolders[job.id] = (state.jobHolders[job.id] ?? []).filter((x) => x !== p.id);
            happy(p, 'fired', deltas, K.FIRED_HAPPINESS);
            return { text: `You were fired from ${job.title}: your dependability is too low.`, deltas };
          }
          let net = gross;
          if (c.rentDebt > 0) {
            const garnish = Math.min(Math.round(gross * RENT_DEBT_GARNISH_FRACTION), c.rentDebt);
            c.rentDebt = Math.round((c.rentDebt - garnish) * 100) / 100;
            c.everGarnished = true;
            net -= garnish;
            if (c.rentDebt > 0) net -= RENT_DEBT_INTEREST_FEE;
            else c.rentDueWeek = monthAfter(state.week); // debt cleared: the monthly cycle restarts
            deltas.push(d('cash', -garnish, 'rent garnished'));
          }
          earn(p, net, 'wages', deltas);
          const depBefore = c.dependability;
          c.dependability = Math.min(maxDep(p), c.dependability + DEPENDABILITY_PER_WORK_SESSION);
          const expBefore = c.experience;
          c.experience = Math.min(maxExp(p), c.experience + 1);
          if (c.dependability !== depBefore) deltas.push(d('dependability', c.dependability - depBefore, 'work'));
          if (c.experience !== expBefore) deltas.push(d('experience', c.experience - expBefore, 'work'));
          c.week.workSessions++;
          return { text: `Worked ${hours}h as ${job.title}`, deltas };
        },
      };
    }

    case 'apply': {
      const job = CLASSIC_JOBS[a.jobId];
      if (!job) return 'No such job';
      const wage = listedWage(state, job.id);
      return {
        label: `${job.title} ($${wage}/h)`,
        group: CLASSIC_LOCATIONS[job.employer].name,
        hours: 4,
        cost: 0,
        check: () => {
          const here = at('employment');
          if (here) return here;
          if (c.jobId === job.id) return 'You already hold this job';
          if (c.week.turnedDown.includes(job.id)) return 'No openings this week';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          const missing: string[] = [];
          if (!job.alwaysHired) {
            if (c.experience < job.experience) missing.push('experience');
            if (c.dependability < requiredDep(job.dependability)) missing.push('dependability');
            if (!job.degrees.every((deg) => c.degrees.includes(deg))) missing.push('education');
          }
          if (missing.length) {
            happy(p, 'job_refused', deltas);
            return { text: `Refused ${job.title}: not enough ${missing.join(', ')}.`, deltas };
          }
          if (!job.alwaysHired) {
            const luck = applicationLuck(c.dependability, c.experience, degreeCount(p));
            let roll: number;
            [state.rng, roll] = nextInt(state.rng, 1, APPLICATION_LUCK_ROLL_MAX);
            const ok = K.APPLICATION_LUCK_INCLUSIVE ? roll <= luck : roll < luck;
            if (!ok) {
              c.week.turnedDown.push(job.id);
              happy(p, 'job_refused', deltas);
              return { text: `Refused ${job.title}: no openings.`, deltas };
            }
          }
          const old = c.jobId;
          if (old) state.jobHolders[old] = (state.jobHolders[old] ?? []).filter((x) => x !== p.id);
          c.jobId = job.id;
          c.wage = wage;
          c.raises = 0;
          state.jobHolders[job.id] = [...(state.jobHolders[job.id] ?? []), p.id];
          if (c.dependability < DEPENDABILITY_NEW_JOB_FLOOR) {
            const gain = DEPENDABILITY_NEW_JOB_FLOOR - c.dependability;
            c.dependability = DEPENDABILITY_NEW_JOB_FLOOR;
            deltas.push(d('dependability', gain, 'new job'));
          }
          happy(p, 'new_job', deltas);
          return { text: `Hired as ${job.title} at $${wage}/h.`, deltas };
        },
      };
    }

    case 'raise': {
      const job = jobOf(p);
      if (!job) return 'You have no job';
      const wage = listedWage(state, job.id);
      return {
        label: `Ask for a raise (${job.title}: $${c.wage} -> $${wage})`,
        hours: 4,
        cost: 0,
        check: () => {
          const here = at('employment');
          if (here) return here;
          if (wage <= c.wage) return 'The listed wage is no better than yours';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          const need = raiseDependabilityThreshold(requiredDep(job.dependability), c.raises);
          if (c.dependability < need) {
            happy(p, 'job_refused', deltas);
            return { text: `Refused a raise: you need ${need} dependability.`, deltas };
          }
          c.wage = wage;
          c.raises++;
          happy(p, 'raise', deltas);
          return { text: `Got a raise to $${wage}/h.`, deltas };
        },
      };
    }

    case 'enroll': {
      const deg = DEGREE_BY_ID[a.degreeId];
      if (!deg) return 'No such course';
      const fee = priceOf(state, ENROLLMENT_FEE_BASE);
      return {
        label: `Enrol in ${deg.name} ($${fee})`,
        // The course list only shows what you can take now: as each degree
        // is acquired, more become available (Hi-Tech U, "Enrolling").
        hidden: () =>
          c.degrees.includes(deg.id) || c.enrolled.includes(deg.id) || (!!deg.prereq && !c.degrees.includes(deg.prereq)),
        hours: 0,
        cost: fee,
        check: () => {
          const here = at('university');
          if (here) return here;
          if (c.degrees.includes(deg.id)) return 'Already graduated';
          if (c.enrolled.includes(deg.id)) return 'Already enrolled';
          if (deg.prereq && !c.degrees.includes(deg.prereq)) return `Requires ${DEGREE_BY_ID[deg.prereq]!.name}`;
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          pay(p, fee, 'enrolment', deltas);
          c.enrolled.push(deg.id);
          c.lessons[deg.id] = c.lessons[deg.id] ?? 0;
          return { text: `Enrolled in ${deg.name}.`, deltas };
        },
      };
    }

    case 'class': {
      const deg = DEGREE_BY_ID[a.degreeId];
      if (!deg) return 'No such course';
      const taken = c.lessons[deg.id] ?? 0;
      const need = lessonsNeeded(p);
      return {
        label: `Take a lesson: ${deg.name} (${taken}/${need})`,
        hidden: () => c.degrees.includes(deg.id) || !c.enrolled.includes(deg.id),
        hours: LESSON_HOURS,
        cost: 0,
        partial: true,
        check: () => {
          const here = at('university');
          if (here) return here;
          if (c.degrees.includes(deg.id)) return 'Already graduated';
          if (!c.enrolled.includes(deg.id)) return 'Enrol first';
          return null;
        },
        run: () => {
          const deltas: Delta[] = [];
          c.lessons[deg.id] = taken + 1;
          deltas.push(d('credits', 1, deg.name));
          if (c.lessons[deg.id]! >= need) {
            c.degrees.push(deg.id);
            c.enrolled = c.enrolled.filter((x) => x !== deg.id);
            c.dependability += DEPENDABILITY_DEGREE_BONUS;
            deltas.push(d('dependability', DEPENDABILITY_DEGREE_BONUS, 'graduated'));
            happy(p, 'new_degree', deltas);
            return { text: `Graduated: ${deg.name}!`, deltas };
          }
          return { text: `Studied ${deg.name} (${c.lessons[deg.id]}/${need}).`, deltas };
        },
      };
    }

    case 'relax':
      return {
        label: `Relax at home (${RELAXATION.relaxHours}h)`,
        hours: RELAXATION.relaxHours,
        cost: 0,
        check: () => (p.node === c.housing ? null : 'Relax at your apartment'),
        run: () => {
          const deltas: Delta[] = [];
          const before = c.relaxation;
          c.relaxation = Math.min(RELAXATION.max, c.relaxation + RELAXATION.relaxGain);
          if (c.relaxation !== before) deltas.push(d('relaxation', c.relaxation - before, 'relaxing'));
          if (!c.week.relaxed) {
            c.week.relaxed = true;
            happy(p, 'relax_first_this_turn', deltas);
          }
          return { text: 'Relaxed at home.', deltas };
        },
      };

    case 'endWeek':
      return {
        label: 'End the week',
        hours: 0,
        cost: 0,
        check: () => null,
        run: () => ({ text: 'Ended the week', deltas: [] }),
      };


    default:
      return null;
  }
}

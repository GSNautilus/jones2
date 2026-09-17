/**
 * The classic ruleset: Jones in the Fast Lane's rules on the Jones 2 map. Content tables live in
 * `../content/classic`; this directory is the logic. The public sim entry points
 * (`applyAction`, `availableActions`, `describeAction`, `resolveWeek`, `goalProgress`,
 * `createGame`) dispatch here when `config.ruleset === 'classic'`.
 */
export * as classicConfig from './config';
export { createClassicGame, newClassicPlayerState } from './game';
export {
  applyAction as classicApplyAction,
  availableActions as classicAvailableActions,
  describeAction as classicDescribeAction,
  listedWage,
  locationAt as classicLocationAt,
  rentOfficeOpen,
} from './actions';
export { resolveWeek as classicResolveWeek } from './week';
export { goalProgress as classicGoalProgress, goalValues as classicGoalValues, goalExcess } from './goals';
export { startWeek as classicStartWeek } from './turnStart';
export { initEconomy as classicInitEconomy } from './economy';
export {
  cp,
  cg,
  isClassic,
  jobOf as classicJobOf,
  liquidAssets,
  stockPrice,
  stockValue,
  hasUniform,
  lessonsNeeded,
  freshCapacity,
  maxDep,
  maxExp,
  type ClassicGameState,
  type ClassicPlayerState,
  type ClassicWeekFlags,
  type PawnedItem,
  type WeekStartEvent,
} from './state';

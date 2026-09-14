import type { LocationId, NodeId, TransportMode } from '@jones2/town';
import type { RngState } from './rng';

export type PlayerId = string;
export type JobId = string;
export type TrackId = 'service' | 'trades' | 'tech' | 'finance' | 'academia';
export type DegreeId = string;
export type ItemId = string;
export type FoodId = string;
export type ActivityId = string;
export type HousingId = string;
export type NewsSourceId = string;
export type AchievementId = string;
export type EconomyEventId = string;

/** All durations are integer game minutes. */
export type Minutes = number;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type GameMode = 'classic' | 'fixed';

export interface GoalTargets {
  /** Net worth in dollars (cash + savings - loan). */
  money: number;
  /** Happiness 0..100. */
  happiness: number;
  /** Total education credits. */
  education: number;
  /** Career prestige 0..100 (from the job currently held). */
  career: number;
}

export interface PlayerSetup {
  id: PlayerId;
  name: string;
}

export interface GameConfig {
  mode: GameMode;
  /** Fixed mode only: number of weeks to play. */
  weeks?: number;
  goals: GoalTargets;
  seed: number;
  players: PlayerSetup[];
  townId: string;
}

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

export interface Clothing {
  /** 0 = rags .. 3 = executive. */
  tier: number;
  /** 0..100, drops weekly; below CLOTHING_SHABBY counts as one tier lower. */
  condition: number;
}

export interface Employment {
  jobId: JobId;
  weeksHeld: number;
  shiftsThisWeek: number;
  /** Consecutive weeks with no shifts worked. Two in a row and you're fired. */
  idleWeeks: number;
}

export interface Forecast {
  eventId: EconomyEventId;
  /** Week the source claims the event will happen. May be wrong for unreliable sources. */
  week: number;
  headline: string;
  source: NewsSourceId;
  /** Week after which this forecast is dropped from the journal. */
  expiresWeek: number;
}

export interface JobApplication {
  jobId: JobId;
  /** Game minute (within the week) at which the application was lodged. */
  minute: Minutes;
}

export interface PropertyOffer {
  housingId: HousingId;
  bid: number;
  minute: Minutes;
}

export interface AchievementClaim {
  id: AchievementId;
  minute: Minutes;
}

export interface WeekCounters {
  meals: number;
  leisureActs: number;
  exerciseActs: number;
  shopping: number;
  classes: number;
  workedMinutes: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  node: NodeId;
  home: HousingId | null;
  /** Owned properties (may include the current home). */
  properties: HousingId[];
  /** Minutes left this week. */
  minutesLeft: Minutes;
  /** Minutes the week started with (for the replay timeline). */
  minutesBudget: Minutes;
  cash: number;
  savings: number;
  loan: number;
  happiness: number;
  health: number;
  /** Set at week end when health is very low; costs hours next week. */
  sick: boolean;
  clothing: Clothing;
  credits: Record<DegreeId, number>;
  degrees: DegreeId[];
  job: Employment | null;
  /** Weeks of experience per track. */
  experience: Record<TrackId, number>;
  items: ItemId[];
  /** Units of groceries on hand (capacity depends on a fridge). */
  groceries: number;
  /** Extra minutes granted for next week (achievement rewards). */
  bonusMinutes: Minutes;
  /** Weeks of bus pass remaining. */
  busPassWeeks: number;
  /** Weeks of insurance remaining. */
  insuranceWeeks: number;
  journal: Forecast[];
  applications: JobApplication[];
  offers: PropertyOffer[];
  claims: AchievementClaim[];
  achievements: AchievementId[];
  /** Nodes visited at least once (for exploration achievements). */
  visited: NodeId[];
  week: WeekCounters;
  weekDone: boolean;
  /** Ordered log of what the player did this week. Cleared at resolution. */
  log: PlayerEvent[];
}

// ---------------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------------

export interface Economy {
  /** Multiplier on store prices. */
  priceIndex: number;
  /** Multiplier on wages. */
  wageIndex: number;
  /** Multiplier on rent. */
  rentIndex: number;
  /** Weekly savings interest. */
  savingsRate: number;
  /** Weekly loan interest. */
  loanRate: number;
  /** Weekly chance of theft for players in unsafe housing. */
  crimeRate: number;
}

export type EconomyEffect =
  | { kind: 'wage'; delta: number; weeks: number }
  | { kind: 'price'; delta: number; weeks: number }
  | { kind: 'rent'; delta: number; weeks: number }
  | { kind: 'crime'; delta: number; weeks: number }
  | { kind: 'layoffs'; track: TrackId }
  | { kind: 'sale'; location: LocationId; discount: number };

export interface ScheduledEvent {
  id: EconomyEventId;
  week: number;
  headline: string;
  effect: EconomyEffect;
  /** Which news sources may report it. */
  categories: ('economy' | 'crime' | 'local')[];
}

export interface ActiveModifier {
  effect: EconomyEffect;
  /** Last week (inclusive) the modifier applies. */
  untilWeek: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type Phase = 'playing' | 'finished';

export interface GameState {
  config: GameConfig;
  week: number;
  phase: Phase;
  rng: RngState;
  players: Record<PlayerId, PlayerState>;
  playerOrder: PlayerId[];
  economy: Economy;
  /** Events scheduled for future weeks. Popped as they fire. */
  schedule: ScheduledEvent[];
  modifiers: ActiveModifier[];
  /** Job holders by job id (list of player ids). */
  jobHolders: Record<JobId, PlayerId[]>;
  propertyOwners: Record<HousingId, PlayerId>;
  achievementsTaken: Record<AchievementId, PlayerId>;
  /** Discounts active this week: location -> multiplier. */
  sales: Record<LocationId, number>;
  winner: PlayerId | null;
  /** Reports from each resolved week, newest last. */
  history: WeekReport[];
}

// ---------------------------------------------------------------------------
// Actions (what a player does during their week)
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'travel'; to: NodeId; mode?: TransportMode }
  | { type: 'work' }
  | { type: 'apply'; jobId: JobId }
  | { type: 'quit' }
  | { type: 'class'; degreeId: DegreeId }
  | { type: 'homeStudy'; degreeId: DegreeId }
  | { type: 'buyItem'; itemId: ItemId }
  | { type: 'pawnItem'; itemId: ItemId }
  | { type: 'buyFood'; foodId: FoodId }
  | { type: 'buyGroceries' }
  | { type: 'cook' }
  | { type: 'activity'; activityId: ActivityId }
  | { type: 'relax'; minutes: Minutes }
  | { type: 'buyClothes'; tier: number }
  | { type: 'rent'; housingId: HousingId }
  | { type: 'offer'; housingId: HousingId; bid: number }
  | { type: 'bank'; op: 'deposit' | 'withdraw' | 'borrow' | 'repay'; amount: number }
  | { type: 'buyNews'; sourceId: NewsSourceId }
  | { type: 'buyBusPass' }
  | { type: 'buyInsurance' }
  | { type: 'clinic' }
  | { type: 'lottery' }
  | { type: 'endWeek' };

export type ActionType = Action['type'];

/** A change to a numeric stat, for logs and UI. */
export interface Delta {
  stat: 'cash' | 'savings' | 'loan' | 'happiness' | 'health' | 'credits' | 'experience';
  amount: number;
  note?: string;
}

export interface PlayerEvent {
  /** Minute of the week at which the action started. */
  minute: Minutes;
  /** Minutes the action consumed. */
  duration: Minutes;
  action: Action;
  node: NodeId;
  /** Travel path, for the replay. */
  path?: NodeId[];
  deltas: Delta[];
  text: string;
}

export interface ActionResult {
  ok: true;
  state: GameState;
  event: PlayerEvent;
}

export interface ActionError {
  ok: false;
  reason: string;
}

/** What the UI shows: an action, whether it can be taken here and now, and why not. */
export interface ActionOption {
  action: Action;
  label: string;
  minutes: Minutes;
  cost: number;
  enabled: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Week resolution
// ---------------------------------------------------------------------------

export interface ResolutionNote {
  player: PlayerId | null;
  text: string;
  deltas?: Delta[];
}

export interface WeekReport {
  week: number;
  notes: ResolutionNote[];
  firedEvents: ScheduledEvent[];
  /** Snapshot of each player's logs for the replay. */
  logs: Record<PlayerId, PlayerEvent[]>;
  winner: PlayerId | null;
}

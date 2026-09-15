/**
 * Public surface of the hot-seat game harness. `GameRoot` switches between
 * Setup / Play / Resolve based on the store's state; the parent (App.tsx) owns
 * the town scene and the ReplayView implementation and passes them in.
 */
import './game.css';

export { useGameStore } from './store';
export type { GameStore } from './store';
export { PLAYER_COLORS, colorForIndex } from './store';
export { SetupScreen } from './SetupScreen';
export { StatsPanel } from './StatsPanel';
export { ActionsPanel } from './ActionsPanel';
export type { ActionsPanelProps } from './ActionsPanel';
export { PlayScreen } from './PlayScreen';
export type { PlayScreenProps } from './PlayScreen';
export { ResolveScreen } from './ResolveScreen';
export type { ReplayProps, ResolveScreenProps } from './ResolveScreen';
export { GameRoot } from './GameRoot';
export type { GameRootProps } from './GameRoot';

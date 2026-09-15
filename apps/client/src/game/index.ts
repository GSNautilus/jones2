/**
 * Public surface of the hot-seat game harness. GameRoot switches between
 * Setup / Play / Resolve based on the store's state; the parent (App.tsx)
 * owns the 3D scene and the ReplayView implementation and passes them in.
 *
 * Plain .ts (not .tsx) so it can use createElement without JSX syntax.
 */
import { createElement, useEffect, useState } from 'react';
import type { ComponentType, MutableRefObject, ReactNode } from 'react';
import { allPlayersDone } from '@jones2/sim';
import type { TownScene, PickResult } from '../map/api';
import { useGameStore } from './store';
import { SetupScreen } from './SetupScreen';
import { PlayScreen } from './PlayScreen';
import { ResolveScreen, type ReplayProps } from './ResolveScreen';
import './game.css';

export { useGameStore } from './store';
export type { GameStore } from './store';
export { PLAYER_COLORS, colorForIndex } from './store';
export { SetupScreen } from './SetupScreen';
export { StatsPanel } from './StatsPanel';
export { ActionsPanel } from './ActionsPanel';
export { PlayScreen } from './PlayScreen';
export type { PlayScreenProps } from './PlayScreen';
export { ResolveScreen } from './ResolveScreen';
export type { ReplayProps, ResolveScreenProps } from './ResolveScreen';

export interface GameRootProps {
  scene: TownScene;
  mapSlot: ReactNode;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
  ReplayView: ComponentType<ReplayProps>;
}

/**
 * The parent wires this up as:
 *   const pickRef = useRef<((hit: PickResult) => void) | null>(null);
 *   const hoverRef = useRef<((hit: PickResult) => void) | null>(null);
 *   const scene = useTownScene({ onPick: h => pickRef.current?.(h), onHover: h => hoverRef.current?.(h) });
 *   <GameRoot scene={scene} mapSlot={<MapCanvas scene={scene} />} pickRef={pickRef} hoverRef={hoverRef} ReplayView={ReplayView} />
 */
export function GameRoot({ scene, mapSlot, pickRef, hoverRef, ReplayView }: GameRootProps) {
  const store = useGameStore();
  const { state } = store;
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (state && state.phase === 'playing' && allPlayersDone(state)) setResolving(true);
  }, [state]);

  if (!state) return createElement(SetupScreen, { store });

  if (resolving || state.phase === 'finished') {
    return createElement(ResolveScreen, {
      store,
      scene,
      ReplayView,
      onExit: () => setResolving(false),
    });
  }

  return createElement(PlayScreen, { store, scene, mapSlot, pickRef, hoverRef });
}

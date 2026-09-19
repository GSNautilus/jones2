/**
 * The play root. One stage: the map fills it, everything else is an overlay.
 *
 * The map is mounted here rather than inside PlayScreen so that it stays put
 * across the play -> resolve -> replay -> play cycle; the week replay needs the
 * same canvas, and remounting it would tear the scene down mid-animation.
 */
import { useEffect, useState } from 'react';
import type { ComponentType, MutableRefObject, ReactNode } from 'react';
import { allPlayersDone } from '@jones2/sim';
import { TOWNS, riverton, type Town } from '@jones2/town';
import type { PickResult, TownScene } from '../map/api';
import '../hud/hud.css';
import { MapControls } from '../hud/MapControls';
import { TimePreviewProvider } from '../hud/preview';
import { ClassicScreen } from '../classic/ClassicScreen';
import '../classic/classic.css';
import { useGameStore } from './store';
import { SetupScreen } from './SetupScreen';
import { PlayScreen } from './PlayScreen';
import { ResolveScreen, type ReplayProps } from './ResolveScreen';

export interface GameRootProps {
  scene: TownScene;
  mapSlot: ReactNode;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
  ReplayView: ComponentType<ReplayProps>;
}

export function GameRoot({ scene, mapSlot, pickRef, hoverRef, ReplayView }: GameRootProps) {
  const store = useGameStore();
  const { state } = store;
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (state && state.phase === 'playing' && allPlayersDone(state)) setResolving(true);
  }, [state]);

  // The map is whichever town the game is on; the setup screen shows Riverton behind the form.
  const townId = state?.config.townId ?? 'riverton';
  useEffect(() => {
    scene.setTown((TOWNS[townId] ?? (riverton as Town)) as Town);
    scene.fitAll();
  }, [scene, townId]);

  if (!state) return <SetupScreen store={store} />;

  const resolvingNow = resolving || state.phase === 'finished';

  return (
    <TimePreviewProvider>
      <div className="stage">
        <div className="stage-map">{mapSlot}</div>
        {resolvingNow ? (
          <>
            <MapControls scene={scene} />
            <ResolveScreen store={store} scene={scene} ReplayView={ReplayView} onExit={() => setResolving(false)} />
          </>
        ) : state.config.ruleset === 'classic' ? (
          <ClassicScreen store={store} scene={scene} pickRef={pickRef} hoverRef={hoverRef} />
        ) : (
          <PlayScreen store={store} scene={scene} pickRef={pickRef} hoverRef={hoverRef} />
        )}
      </div>
    </TimePreviewProvider>
  );
}

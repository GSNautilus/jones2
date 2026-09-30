/**
 * An online seat's screen. The classic play screen and the recap are the
 * hot-seat ones, fed by an online store with the same shape (GameStore).
 */
import { useEffect, useMemo, useSyncExternalStore, type ComponentType, type MutableRefObject, type ReactNode } from 'react';
import { TOWNS, riverton, type Town } from '@jones2/town';
import type { PickResult, TownScene } from '../map/api';
import '../hud/hud.css';
import '../classic/classic.css';
import { Frame, FrameButton } from '../hud/Frame';
import { MapControls } from '../hud/MapControls';
import { TimePreviewProvider } from '../hud/preview';
import { ClassicScreen } from '../classic/ClassicScreen';
import { ResolveScreen, type ReplayProps } from '../game/ResolveScreen';
import { colorForIndex, type GameStore } from '../game/store';
import * as api from './api';
import { switchToBucketAudio } from './audio';
import { OnlineGame, type View } from './game';

export function useOnlineGame(gameId: string, playerId: string): { game: OnlineGame; view: View } {
  const game = useMemo(() => new OnlineGame(gameId, playerId, api), [gameId, playerId]);
  const view = useSyncExternalStore(game.subscribe, game.getView);
  useEffect(() => {
    void game.load();
    return () => game.dispose();
  }, [game]);
  // Waiting: look again every 20 s, and whenever the tab comes back.
  useEffect(() => {
    if (view.phase !== 'waiting') return;
    const tick = setInterval(() => void game.refresh(), 20_000);
    const onShow = () => {
      if (!document.hidden) void game.refresh();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [game, view.phase]);
  // Leaving the page mid-week: save the draft now.
  useEffect(() => {
    const save = () => void game.flushDraft();
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [game]);
  return { game, view };
}

const goHome = () => {
  location.hash = '';
};

/** The online game as the GameStore the shared screens expect. */
function asStore(game: OnlineGame, view: View): GameStore {
  const colors: Record<string, string> = {};
  view.state?.playerOrder.forEach((id, i) => (colors[id] = colorForIndex(i)));
  return {
    state: view.state,
    setState: () => undefined,
    currentPid: game.playerId,
    setCurrentPid: () => undefined,
    error: view.error,
    start: () => undefined,
    act: game.act,
    resolve: game.resolve,
    reset: goHome,
    lastReport: view.lastReport,
    weekStarts: view.weekStarts,
    playerColors: colors,
  };
}

function Waiting({ game, view }: { game: OnlineGame; view: View }) {
  const others = view.status.filter((s) => s.player_id !== game.playerId);
  const still = others.filter((s) => !s.submitted).map((s) => s.name);
  return (
    <div className="hud-modal">
      <Frame title={`Week ${view.state?.week ?? ''} — ${view.gameName}`} className="hud-modal-card">
        {view.submitting ? (
          <p className="hud-tagline">Handing in your week…</p>
        ) : view.submitError ? (
          <>
            <p className="hud-tagline">Your week did not go through: {view.submitError}</p>
            <div className="hud-row hud-row-wrap">
              {view.submitRejected ? (
                <FrameButton onClick={() => void game.restartWeek()}>Play the week again</FrameButton>
              ) : (
                <FrameButton onClick={() => void game.submit()}>Try again</FrameButton>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="hud-tagline">Your week is in.</p>
            {still.length > 0 ? (
              <p className="hud-tagline">Still playing: {still.join(', ')}. The week ends when everyone is in; come back any time.</p>
            ) : (
              <p className="hud-tagline">Waiting for the week to end…</p>
            )}
            <div className="hud-row hud-row-wrap">
              <FrameButton onClick={() => void game.refresh()}>Check now</FrameButton>
              <FrameButton onClick={goHome}>Home</FrameButton>
            </div>
          </>
        )}
      </Frame>
    </div>
  );
}

export interface OnlineRootProps {
  gameId: string;
  playerId: string;
  scene: TownScene;
  mapSlot: ReactNode;
  pickRef: MutableRefObject<((hit: PickResult) => void) | null>;
  hoverRef: MutableRefObject<((hit: PickResult) => void) | null>;
  ReplayView: ComponentType<ReplayProps>;
}

export function OnlineRoot({ gameId, playerId, scene, mapSlot, pickRef, hoverRef, ReplayView }: OnlineRootProps) {
  // Before any child mounts: React runs a child's effects before its parent's, and the
  // classic screen loads the sound map in its first effect. Downloads start only once
  // the session holds a seat, which the load below ensures.
  switchToBucketAudio();
  const { game, view } = useOnlineGame(gameId, playerId);
  const townId = view.state?.config.townId ?? 'classic';
  useEffect(() => {
    scene.setTown((TOWNS[townId] ?? (riverton as Town)) as Town);
    scene.fitAll();
  }, [scene, townId]);

  const store = asStore(game, view);
  let overlay: ReactNode;
  if (view.phase === 'loading') {
    overlay = (
      <div className="hud-modal">
        <Frame title="Jones 2" className="hud-modal-card">
          <p className="hud-tagline">Opening your game…</p>
        </Frame>
      </div>
    );
  } else if (view.phase === 'error') {
    overlay = (
      <div className="hud-modal">
        <Frame title="Could not open the game" className="hud-modal-card">
          <p className="hud-tagline">{view.problem}</p>
          <div className="hud-row hud-row-wrap">
            <FrameButton onClick={() => void game.load()}>Try again</FrameButton>
            <FrameButton onClick={goHome}>Home</FrameButton>
          </div>
        </Frame>
      </div>
    );
  } else if (view.phase === 'recap' || view.phase === 'over') {
    overlay = (
      <>
        <MapControls scene={scene} />
        <ResolveScreen store={store} scene={scene} ReplayView={ReplayView} onExit={game.finishRecap} />
      </>
    );
  } else if (view.phase === 'waiting') {
    overlay = <Waiting game={game} view={view} />;
  } else {
    overlay = <ClassicScreen store={store} scene={scene} pickRef={pickRef} hoverRef={hoverRef} />;
  }

  return (
    <TimePreviewProvider>
      <div className="stage">
        <div className="stage-map">{mapSlot}</div>
        {overlay}
      </div>
    </TimePreviewProvider>
  );
}

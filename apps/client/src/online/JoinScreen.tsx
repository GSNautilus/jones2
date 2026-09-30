/** Opening an invite link: sign this browser in, claim the seat, go to the game. */
import { useEffect, useState } from 'react';
import '../hud/hud.css';
import { Frame, FrameButton } from '../hud/Frame';
import { ensureSession, redeem } from './api';
import { gameHash } from './route';

export function JoinScreen({ token }: { token: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setProblem(null);
    (async () => {
      await ensureSession();
      const seat = await redeem(token);
      // Replace, so Back does not redeem again; the game address is the one to bookmark.
      if (live) location.replace(gameHash(seat.gameId, seat.playerId));
    })().catch((e: unknown) => {
      if (live) setProblem(e instanceof Error ? e.message : String(e));
    });
    return () => {
      live = false;
    };
  }, [token, attempt]);

  return (
    <div className="hud-modal">
      <Frame title="Joining the game" className="hud-modal-card">
        {problem ? (
          <>
            <p className="hud-tagline">{problem}</p>
            <div className="hud-row hud-row-wrap">
              <FrameButton onClick={() => setAttempt((n) => n + 1)}>Try again</FrameButton>
              <FrameButton onClick={() => (location.hash = '')}>Home</FrameButton>
            </div>
          </>
        ) : (
          <p className="hud-tagline">Taking your seat…</p>
        )}
      </Frame>
    </div>
  );
}

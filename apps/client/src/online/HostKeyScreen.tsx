/** Opening the host link: sign this browser in, make it a host device, open the host panel. */
import { useEffect, useState } from 'react';
import '../hud/hud.css';
import { Frame, FrameButton } from '../hud/Frame';
import { ensureSession, redeemHost } from './api';
import { hostHash } from './route';

export function HostKeyScreen({ token }: { token: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setProblem(null);
    (async () => {
      await ensureSession();
      await redeemHost(token);
      if (live) location.replace(hostHash());
    })().catch((e: unknown) => {
      if (live) setProblem(e instanceof Error ? e.message : String(e));
    });
    return () => {
      live = false;
    };
  }, [token, attempt]);

  return (
    <div className="hud-modal">
      <Frame title="Host sign-in" className="hud-modal-card">
        {problem ? (
          <>
            <p className="hud-tagline">{problem}</p>
            <div className="hud-row hud-row-wrap">
              <FrameButton onClick={() => setAttempt((n) => n + 1)}>Try again</FrameButton>
              <FrameButton onClick={() => (location.hash = '')}>Home</FrameButton>
            </div>
          </>
        ) : (
          <p className="hud-tagline">Making this device a host device…</p>
        )}
      </Frame>
    </div>
  );
}

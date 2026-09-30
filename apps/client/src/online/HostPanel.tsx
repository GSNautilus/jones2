/**
 * The host panel (#/host): every online game, and for each seat its link
 * (send it, or play as that player), how many devices use it, whether this
 * week is handed in, and a replacement link for one that went astray.
 */
import { useCallback, useEffect, useState } from 'react';
import '../hud/hud.css';
import { Frame, FrameButton } from '../hud/Frame';
import { hostDeleteGame, hostGames, hostReplaceLink, hostSeats, type HostGame, type HostSeatStatus } from './api';
import { hostHash, playerLink } from './route';
import { sendLink } from './share';

function Seats({ game, onDeleted }: { game: HostGame; onDeleted: () => void }) {
  const [seats, setSeats] = useState<HostSeatStatus[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    hostSeats(game.gameId)
      .then(setSeats)
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [game.gameId]);
  useEffect(load, [load]);

  const send = async (s: HostSeatStatus) => {
    if (!s.token) return;
    const how = await sendLink(s.name, playerLink(s.token));
    setNote(how === 'copied' ? `${s.name}'s link is copied. Paste it into a message to them.` : how === 'shared' || how === 'cancelled' ? null : `Could not copy. ${s.name}'s link: ${playerLink(s.token)}`);
  };

  const replace = async (s: HostSeatStatus) => {
    if (!confirm(`Make a new link for ${s.name}? The old link stops working, and every device that opened it is signed out of this game.`)) return;
    try {
      await hostReplaceLink(game.gameId, s.playerId);
      setNote(`${s.name} has a new link. Send it to them.`);
      load();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${game.name}" for everyone? This cannot be undone.`)) return;
    try {
      await hostDeleteGame(game.gameId);
      onDeleted();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    }
  };

  if (problem) return <p className="hud-tagline">{problem}</p>;
  if (!seats) return <p className="hud-tagline">Loading…</p>;
  return (
    <div className="host-seats">
      <table>
        <tbody>
          {seats.map((s) => (
            <tr key={s.playerId}>
              <td className="host-name">{s.name}</td>
              <td>{s.devices === 0 ? 'link not opened yet' : `on ${s.devices} device${s.devices === 1 ? '' : 's'}`}</td>
              <td>{game.status === 'finished' ? '' : s.submitted ? `week ${game.week} handed in` : `playing week ${game.week}`}</td>
              <td className="host-actions">
                {s.token ? (
                  <>
                    <FrameButton onClick={() => void send(s)}>Send link</FrameButton>
                    <FrameButton onClick={() => (location.hash = `#/join/${s.token}`)}>Play as {s.name}</FrameButton>
                  </>
                ) : (
                  <span className="hud-tagline">link not kept; make a new one</span>
                )}
                <FrameButton onClick={() => void replace(s)}>New link</FrameButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="hud-tagline">{note}</p>}
      <div className="hud-row hud-row-wrap">
        <FrameButton onClick={() => void remove()}>Delete this game</FrameButton>
      </div>
    </div>
  );
}

export function HostPanel({ focus }: { focus: string | null }) {
  const [games, setGames] = useState<HostGame[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(focus);

  const load = useCallback(() => {
    hostGames()
      .then((g) => {
        setGames(g);
        setOpen((o) => o ?? g[0]?.gameId ?? null);
      })
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => setOpen(focus), [focus]);

  return (
    <div className="hud-modal">
      <Frame title="Host — your online games" className="hud-modal-card hud-modal-wide host-panel">
        {problem ? (
          <p className="hud-tagline">{problem} (Is this device a host device? Open your host link on it.)</p>
        ) : !games ? (
          <p className="hud-tagline">Loading…</p>
        ) : games.length === 0 ? (
          <p className="hud-tagline">No online games yet. Start one from the new game screen: choose "Online".</p>
        ) : (
          games.map((g) => (
            <div key={g.gameId} className="host-game">
              <button
                className="host-game-title"
                onClick={() => {
                  setOpen(open === g.gameId ? null : g.gameId);
                  history.replaceState(null, '', hostHash(open === g.gameId ? null : g.gameId));
                }}
              >
                {g.name} — {g.status === 'finished' ? 'finished' : `week ${g.week}`}, started {g.createdAt.slice(0, 10)}
              </button>
              {open === g.gameId && (
                <Seats
                  game={g}
                  onDeleted={() => {
                    setOpen(null);
                    load();
                  }}
                />
              )}
            </div>
          ))
        )}
        <div className="hud-row hud-row-wrap">
          <FrameButton onClick={() => (location.hash = '')}>New game</FrameButton>
          <FrameButton onClick={load}>Refresh</FrameButton>
        </div>
      </Frame>
    </div>
  );
}

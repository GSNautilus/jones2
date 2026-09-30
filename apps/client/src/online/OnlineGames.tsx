/**
 * On the home screen: the online games this browser holds a seat in, as
 * links. Shows nothing for a browser that never opened an invite (it never
 * signs in just to look).
 */
import { useEffect, useState } from 'react';
import { mySeats, type SeatSummary } from './api';
import { switchToBucketAudio } from './audio';
import { gameHash } from './route';

export function OnlineGames() {
  const [seats, setSeats] = useState<SeatSummary[]>([]);
  useEffect(() => {
    let live = true;
    mySeats()
      .then((s) => {
        if (!live) return;
        setSeats(s);
        if (s.length > 0) switchToBucketAudio();
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (seats.length === 0) return null;
  return (
    <div className="online-games">
      <b>Your online games</b>
      <ul>
        {seats.map((s) => (
          <li key={`${s.gameId}/${s.playerId}`}>
            <a href={gameHash(s.gameId, s.playerId)}>
              {s.gameName}: {s.name}, {s.status === 'finished' ? 'finished' : `week ${s.week}`}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

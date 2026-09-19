/**
 * React controls for the week replay: drives a `TownScene` by advancing a
 * clock (game minutes per real second = speed) and pushing poses from a
 * `ReplayTimeline` each animation frame. Renders only overlay controls —
 * the canvas itself belongs to whoever mounted the scene.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NodeId, Town, TownGraph } from '@jones2/town';
import type { PlayerEvent, PlayerId } from '@jones2/sim';
import type { FigureStyle, TownScene } from '../map/api';
import { ZOOM_IN } from '../hud/MapControls';
import { buildTimeline } from './timeline';
import type { ReplayMarker } from './types';

const SPEEDS = [60, 120, 300, 900] as const;
const DAY_MINUTES = 12 * 60;

export interface ReplayViewProps {
  scene: TownScene;
  town: Town;
  graph: TownGraph;
  logs: Record<PlayerId, PlayerEvent[]>;
  starts: Record<PlayerId, NodeId>;
  /** `label` is the figure's map label (a token marker, say); the name when absent. */
  players: Record<PlayerId, { name: string; color: string; label?: string }>;
  onDone?: () => void;
}

function formatClock(minute: number): string {
  const m = Math.max(0, Math.floor(minute));
  const day = Math.floor(m / DAY_MINUTES) + 1;
  const hour = 8 + Math.floor((m % DAY_MINUTES) / 60);
  const mins = m % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Day ${day}, ${pad(hour)}:${pad(mins)}`;
}

export function ReplayView({ scene, town, graph, logs, starts, players, onDone }: ReplayViewProps) {
  const timeline = useMemo(() => buildTimeline({ town, graph, logs, starts }), [town, graph, logs, starts]);
  const playerIds = useMemo(() => Object.keys(players), [players]);

  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(120);
  const [followed, setFollowed] = useState<PlayerId | null>(null);
  const [captions, setCaptions] = useState<Record<PlayerId, string>>({});

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const minuteRef = useRef(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  playingRef.current = playing;
  speedRef.current = speed;
  onDoneRef.current = onDone;

  // The figures, with what each player is doing right now as the caption
  // bubble over their head. The renderer only knows about figures that exist,
  // so the whole set is declared each time the captions change.
  const styleFigures = useCallback(
    (captions: Record<PlayerId, string>) => {
      const figures: Record<string, FigureStyle> = {};
      for (const id of playerIds) {
        const p = players[id];
        if (!p) continue;
        figures[id] = { color: p.color, label: p.label ?? p.name };
        const caption = captions[id];
        if (caption) figures[id]!.caption = caption;
      }
      scene.setFigures(figures);
    },
    [scene, players, playerIds],
  );
  // The parent may hand over a fresh `players` object on any re-render (the
  // store changes under it), which redeclares the figures: the current
  // captions go back on, or the bubbles would vanish mid-recap.
  const captionsRef = useRef<Record<PlayerId, string>>({});
  useEffect(() => styleFigures(captionsRef.current), [styleFigures]);

  const applyMinute = useCallback(
    (m: number) => {
      const clamped = Math.max(0, Math.min(timeline.totalMinutes, m));
      minuteRef.current = clamped;
      setMinute(clamped);
      const frame = timeline.at(clamped);
      scene.setPoses(frame.poses);
      setCaptions(frame.captions);
      const before = JSON.stringify(captionsRef.current);
      captionsRef.current = frame.captions;
      if (JSON.stringify(frame.captions) !== before) styleFigures(frame.captions);
    },
    [timeline, scene, styleFigures],
  );

  // Reset to the start whenever we get a new timeline (new scene/week), and
  // frame it: the whole town, one zoom step in so the name plates and caption
  // bubbles are drawn (they hide below zoom 2), centred on where everyone starts.
  useEffect(() => {
    doneRef.current = false;
    captionsRef.current = {};
    applyMinute(0);
    scene.follow(null);
    scene.fitAll();
    scene.zoom(ZOOM_IN);
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of Object.keys(starts)) {
      const node = graph.node(starts[id]!);
      sx += node.x;
      sy += node.y;
      n++;
    }
    if (n > 0) scene.panTo(sx / n, sy / n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  // Animation loop: advance the clock while playing.
  useEffect(() => {
    function tick(ts: number) {
      rafRef.current = requestAnimationFrame(tick);
      if (!playingRef.current) {
        lastTsRef.current = ts;
        return;
      }
      if (lastTsRef.current == null) {
        lastTsRef.current = ts;
        return;
      }
      const dtSeconds = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const next = minuteRef.current + dtSeconds * speedRef.current;
      if (next >= timeline.totalMinutes) {
        applyMinute(timeline.totalMinutes);
        setPlaying(false);
        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current?.();
        }
      } else {
        applyMinute(next);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [timeline, applyMinute]);

  // Keyboard: space play/pause, left/right seek 30 minutes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        applyMinute(minuteRef.current - 30);
      } else if (e.code === 'ArrowRight') {
        applyMinute(minuteRef.current + 30);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyMinute]);

  const markerPool: ReplayMarker[] = useMemo(
    () => (followed ? timeline.markers.filter((m) => m.playerId === followed) : timeline.markers),
    [timeline, followed],
  );

  const currentMarkerIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < markerPool.length; i++) {
      if (markerPool[i]!.minute <= minute) idx = i;
      else break;
    }
    return idx;
  }, [markerPool, minute]);

  const stepMarker = (dir: 1 | -1) => {
    if (markerPool.length === 0) return;
    if (dir === 1) {
      const next = markerPool.find((m) => m.minute > minute);
      if (next) applyMinute(next.minute);
    } else {
      let prev: ReplayMarker | undefined;
      for (const m of markerPool) {
        if (m.minute < minute) prev = m;
        else break;
      }
      if (prev) applyMinute(prev.minute);
    }
  };

  return (
    <>
      {followed && (
        <div className="overlay" style={{ flexDirection: 'column', maxWidth: 260, background: 'var(--panel)', padding: 10, borderRadius: 8, border: '1px solid var(--line)' }}>
          <strong>{players[followed]?.name ?? followed}</strong>
          <div className="muted" style={{ minHeight: '1.2em' }}>{captions[followed] || '—'}</div>
          <ul className="log" style={{ maxHeight: 160, overflow: 'auto', marginTop: 6 }}>
            {markerPool.map((m, i) => (
              <li
                key={`${m.playerId}-${m.minute}-${i}`}
                onClick={() => applyMinute(m.minute)}
                style={{ cursor: 'pointer', background: i === currentMarkerIndex ? 'var(--accent-soft)' : undefined }}
              >
                {formatClock(m.minute)} — {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overlay bottom" style={{ flexDirection: 'column', gap: 8, background: 'var(--panel)', padding: 10, borderRadius: 8, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: 'auto' }}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s} min/s</option>
            ))}
          </select>
          <button onClick={() => stepMarker(-1)}>Prev</button>
          <button onClick={() => stepMarker(1)}>Next</button>
          <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{formatClock(minute)}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min={0}
            max={timeline.totalMinutes}
            value={minute}
            onChange={(e) => applyMinute(Number(e.target.value))}
          />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', height: 6, pointerEvents: 'none' }}>
            {timeline.markers.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(m.minute / Math.max(1, timeline.totalMinutes)) * 100}%`,
                  width: 2,
                  height: 6,
                  background: 'var(--muted)',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setFollowed(null);
              scene.follow(null);
              scene.fitAll();
            }}
          >
            Overview
          </button>
          {playerIds.map((id) => (
            <button
              key={id}
              onClick={() => {
                setFollowed(id);
                scene.follow(id);
              }}
            >
              Follow {players[id]?.name ?? id}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

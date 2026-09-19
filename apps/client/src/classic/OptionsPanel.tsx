/**
 * OPTIONS: the music and sound volumes with a mute for each, and the way out
 * to a new game. A DOM window rather than a PixelPanel because the pixel
 * window has no slider. "Sound" is one dial for effects and the clerks'
 * voices together.
 */
import { useState } from 'react';
import { audio } from '../audio';
import type { AudioSettings } from '../audio/player';
import { Frame, FrameButton } from '../hud/Frame';

export interface OptionsPanelProps {
  /** Ambient life on the map (traffic, birds, aircraft). */
  animation?: { on: boolean; onChange: (on: boolean) => void };
  onClose: () => void;
  /** The player confirmed abandoning this game for a new one. */
  onNewGame: () => void;
}

function VolumeRow({
  label,
  value,
  muted,
  onChange,
  onMute,
  onRelease,
}: {
  label: string;
  value: number;
  muted: boolean;
  onChange: (v: number) => void;
  onMute: () => void;
  onRelease?: () => void;
}) {
  return (
    <div className={`classic-volume${muted ? ' is-muted' : ''}`}>
      <span className="classic-volume-label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        aria-label={`${label} volume`}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
      />
      <span className="classic-volume-value">{`${Math.round(value * 100)}%`}</span>
      <FrameButton active={muted} title={muted ? `${label} is muted. Click to unmute.` : `Mute ${label.toLowerCase()}`} onClick={onMute}>
        {muted ? 'MUTED' : 'MUTE'}
      </FrameButton>
    </div>
  );
}

export function OptionsPanel({ onClose, onNewGame, animation }: OptionsPanelProps) {
  const [settings, setSettings] = useState<AudioSettings>(() => audio.current);
  const apply = (patch: Partial<AudioSettings>) => {
    audio.update(patch);
    setSettings(audio.current);
  };
  return (
    <div className="classic-modal">
      <Frame title="Options" className="classic-options">
        <VolumeRow
          label="Music"
          value={settings.music}
          muted={settings.musicMuted}
          onChange={(v) => apply({ music: v })}
          onMute={() => apply({ musicMuted: !settings.musicMuted })}
        />
        <VolumeRow
          label="Sound"
          value={settings.sfx}
          muted={settings.soundMuted}
          onChange={(v) => apply({ sfx: v, voice: v })}
          onMute={() => apply({ soundMuted: !settings.soundMuted })}
          // A click at the new level, so the dial can be set by ear.
          onRelease={() => audio.play('door')}
        />
        {animation && (
          <div className="classic-options-row">
            <span className="classic-options-label">Animation</span>
            <FrameButton
              title="Cars on the roads, birds and aircraft over the town"
              onClick={() => animation.onChange(!animation.on)}
            >
              {animation.on ? 'Traffic and birds: ON' : 'Traffic and birds: OFF'}
            </FrameButton>
          </div>
        )}
        <div className="classic-options-actions">
          <FrameButton
            title="Abandon this game and return to setup"
            onClick={() => {
              if (window.confirm('Abandon this game and start a new one?')) onNewGame();
            }}
          >
            New game
          </FrameButton>
          <FrameButton onClick={onClose}>Done</FrameButton>
        </div>
      </Frame>
    </div>
  );
}

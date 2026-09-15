/**
 * The HUD's furniture: a chunky bevelled frame, in the spirit of the original's
 * wooden panels. Pure CSS (see `hud.css`) so it works before the pixel UI
 * 9-slice sprite exists; `skin.ts` is where that swap would happen.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface FrameProps {
  /** Optional brass title bar. */
  title?: ReactNode;
  /** Right-hand side of the title bar (a close/collapse button, usually). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** `dark` inverts the fill for overlays on top of the map. */
  tone?: 'panel' | 'dark';
}

export function Frame({ title, actions, children, className, style, tone = 'panel' }: FrameProps) {
  return (
    <div className={`hud-frame hud-frame-${tone}${className ? ` ${className}` : ''}`} style={style}>
      {title != null && (
        <div className="hud-frame-title">
          <span className="hud-frame-title-text">{title}</span>
          {actions}
        </div>
      )}
      <div className="hud-frame-body">{children}</div>
    </div>
  );
}

/** A small framed toggle used for drawers and map controls. */
export function FrameButton({
  children,
  onClick,
  title,
  active,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`hud-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
}

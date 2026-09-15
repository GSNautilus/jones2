/**
 * Public surface of the HUD. The game screens import from here; nothing outside
 * `src/hud/` should reach into individual HUD files.
 */
import './hud.css';

export { Clock, CLOCK_ART } from './Clock';
export type { ClockProps } from './Clock';
export { Frame, FrameButton } from './Frame';
export type { FrameProps } from './Frame';
export { StatusStrip } from './StatusStrip';
export { LocationPanel } from './LocationPanel';
export { WeekLog, stamp } from './WeekLog';
export { MapControls, ZOOM_IN, ZOOM_OUT } from './MapControls';
export { TimePreviewProvider, useTimePreview, useSetTimePreview, usePreviewHandlers } from './preview';
export type { TimePreviewApi } from './preview';
export { HUD, clockSkin, hasPixelSkin, uiSprite } from './skin';
export * from './clockMath';

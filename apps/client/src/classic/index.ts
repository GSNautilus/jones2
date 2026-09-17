/**
 * Public surface of the classic play interface. The Jones 2 screen
 * (`src/game/PlayScreen.tsx`) is untouched and still runs when
 * `GameConfig.ruleset` is not 'classic'; `GameRoot` picks between them.
 */
import './classic.css';

export { ClassicScreen } from './ClassicScreen';
export type { ClassicScreenProps } from './ClassicScreen';
export { PixelPanel } from './PixelPanel';
export type { PixelPanelProps } from './PixelPanel';
export * from './layout';
export * from './menu';
export * from './cards';
export * from './locations';
export * from './tokens';
export * from './tooltip';
export { goalsModel, statsModel } from './screens';
export { fontSafe, nine, paintPanel, renderPanel, NO_HOVER, type PaintState } from './paint';

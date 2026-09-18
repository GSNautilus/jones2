/** One audio player for the whole client. */
import { AudioPlayer } from './player';

export const audio = new AudioPlayer();
export { sfxForEvent } from './events';
export type { SfxKey } from './map';
export { resolveMap } from './map';
export { cardLine, greetingLine, quoteGroupFor, quoteGroupsFor, quoteLine, refusalGroupFor, voiceFile } from './voices';
export type { VoicesFile } from './voices';

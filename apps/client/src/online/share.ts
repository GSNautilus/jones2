/**
 * Hand a player their link: the phone's share sheet where there is one
 * (text message, mail, chat), else the clipboard.
 */
export type Shared = 'shared' | 'cancelled' | 'copied' | 'failed';

export async function sendLink(name: string, url: string, nav: Partial<Navigator> = navigator): Promise<Shared> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: 'Jones 2', text: `${name}, this is your link to our Jones 2 game. Keep it: it opens your game on any device.`, url });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
      // anything else: fall back to copying
    }
  }
  if (!nav.clipboard) return 'failed';
  try {
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

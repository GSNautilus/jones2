/**
 * Online addresses live in the URL hash, so the static site needs no server
 * routing and a token never reaches any server log:
 *   #/join/<token>             a player's link: join the seat, then go to the game
 *   #/game/<gameId>/<playerId> play (or watch) that seat's week
 *   #/hostkey/<token>          the host's link: make this device a host device
 *   #/host  or  #/host/<id>    the host panel (optionally opened on one game)
 *   #/new                      the new game screen, even with a local game saved
 * Anything else is the local hot-seat game.
 */
export type Route =
  | { kind: 'local' }
  | { kind: 'join'; token: string }
  | { kind: 'game'; gameId: string; playerId: string }
  | { kind: 'hostkey'; token: string }
  | { kind: 'host'; gameId: string | null }
  | { kind: 'new' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{20,}$/;

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'join' && parts[1] && TOKEN.test(parts[1])) return { kind: 'join', token: parts[1] };
  if (parts[0] === 'game' && parts[1] && UUID.test(parts[1]) && parts[2] && /^[A-Za-z0-9_-]{1,64}$/.test(parts[2])) {
    return { kind: 'game', gameId: parts[1], playerId: parts[2] };
  }
  if (parts[0] === 'hostkey' && parts[1] && TOKEN.test(parts[1])) return { kind: 'hostkey', token: parts[1] };
  if (parts[0] === 'new' && parts.length === 1) return { kind: 'new' };
  if (parts[0] === 'host' && parts.length === 1) return { kind: 'host', gameId: null };
  if (parts[0] === 'host' && parts[1] && UUID.test(parts[1])) return { kind: 'host', gameId: parts[1] };
  return { kind: 'local' };
}

/** The new game screen, whatever local game is saved. */
export const NEW_GAME_HASH = '#/new';

export function gameHash(gameId: string, playerId: string): string {
  return `#/game/${gameId}/${playerId}`;
}

export function hostHash(gameId?: string | null): string {
  return gameId ? `#/host/${gameId}` : '#/host';
}

/** A full player link for this site, wherever it is served from (Pages, or the dev server). */
export function playerLink(token: string, where: { origin: string; pathname: string } = location): string {
  return `${where.origin}${where.pathname}#/join/${token}`;
}

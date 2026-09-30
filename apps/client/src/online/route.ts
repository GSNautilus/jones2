/**
 * Online addresses live in the URL hash, so the static site needs no server
 * routing and an invite token never reaches any server log:
 *   #/join/<token>             redeem an invite, then go to the game
 *   #/game/<gameId>/<playerId> play (or watch) that seat's week
 * Anything else is the local hot-seat game.
 */
export type Route = { kind: 'local' } | { kind: 'join'; token: string } | { kind: 'game'; gameId: string; playerId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'join' && parts[1] && /^[A-Za-z0-9_-]{20,}$/.test(parts[1])) return { kind: 'join', token: parts[1] };
  if (parts[0] === 'game' && parts[1] && UUID.test(parts[1]) && parts[2] && /^[A-Za-z0-9_-]{1,64}$/.test(parts[2])) {
    return { kind: 'game', gameId: parts[1], playerId: parts[2] };
  }
  return { kind: 'local' };
}

export function gameHash(gameId: string, playerId: string): string {
  return `#/game/${gameId}/${playerId}`;
}

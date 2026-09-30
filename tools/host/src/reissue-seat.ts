/**
 * Give a player a new link when the old one reached the wrong person. The old
 * link stops working, and every device it opened is signed out of the seat;
 * the week in progress is kept. (A new phone does not need this: the player
 * just opens their link on it.)
 *
 *   npm run reissue-seat -w @jones2/host -- --game <game id> --player <name or p0..p3>
 *
 * `list-games` shows game ids and seats.
 */
import { adminClient, checkReachable, explain, projectUrl } from './admin';
import { DEFAULT_SITE, inviteLink, newToken, parseArgs, tokenHash } from './games';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.game || !args.player) throw new Error('Usage: --game <game id> --player <name or p0..p3>. See list-games.');
  const client = adminClient();
  const unreachable = await checkReachable(projectUrl());
  if (unreachable) throw new Error(unreachable);
  const { data, error } = await client.from('seats').select('player_id, name').eq('game_id', args.game);
  if (error) throw new Error(explain('Reading the seats', error.message));
  const seats = (data ?? []) as { player_id: string; name: string }[];
  if (seats.length === 0) throw new Error(`No game ${args.game}. See list-games.`);
  const want = args.player.toLowerCase();
  const seat = seats.find((s) => s.player_id === args.player || s.name.toLowerCase() === want);
  if (!seat) throw new Error(`No player "${args.player}" in that game. Seats: ${seats.map((s) => `${s.player_id} ${s.name}`).join(', ')}`);

  const token = newToken();
  const u = await client
    .from('seats')
    .update({ token_hash: tokenHash(token), claimed_at: null })
    .eq('game_id', args.game)
    .eq('player_id', seat.player_id);
  if (u.error) throw new Error(explain('Re-issuing the seat', u.error.message));
  const d = await client.from('seat_devices').delete().eq('game_id', args.game).eq('player_id', seat.player_id);
  if (d.error) throw new Error(explain('Signing out the old devices', d.error.message));
  console.log(`New link for ${seat.name} . The old link no longer works, and its devices are signed out:\n  ${inviteLink(args.site ?? DEFAULT_SITE, token)}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

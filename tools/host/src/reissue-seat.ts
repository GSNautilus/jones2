/**
 * Give a player a fresh invite link: for a new device, a cleared browser, or a
 * link sent to the wrong person. The old link and the device that used it stop
 * working for that seat; the week in progress is kept.
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
    .update({ token_hash: tokenHash(token), user_id: null, claimed_at: null })
    .eq('game_id', args.game)
    .eq('player_id', seat.player_id);
  if (u.error) throw new Error(explain('Re-issuing the seat', u.error.message));
  console.log(`New link for ${seat.name} (the old one no longer works):\n  ${inviteLink(args.site ?? DEFAULT_SITE, token)}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

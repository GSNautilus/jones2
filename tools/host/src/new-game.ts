/**
 * Create an online game and print one invite link per player.
 *
 * PowerShell, from the repo root, with SUPABASE_URL and SUPABASE_SECRET_KEY set:
 *   npm run new-game -w @jones2/host -- --players "Ann,Bob,Cy" [--map classic|riverton] [--name "Family"] [--seed 123]
 *
 * Each link works once: it binds its seat to the first device that opens it.
 * Send each person their own link. Lost it, or a new device? `reissue-seat`.
 */
import { createGame } from '@jones2/sim';
import { adminClient, explain } from './admin';
import { DEFAULT_SITE, gameConfig, inviteLink, newToken, parseArgs, parsePlayers, tokenHash } from './games';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const names = parsePlayers(args.players);
  if (typeof names === 'string') throw new Error(names);
  const seed = args.seed === undefined ? undefined : Number(args.seed);
  if (seed !== undefined && !Number.isInteger(seed)) throw new Error('--seed must be a whole number');
  const config = gameConfig(names, { map: args.map, seed });
  if (typeof config === 'string') throw new Error(config);
  const site = args.site ?? DEFAULT_SITE;

  const client = adminClient();
  const state = createGame(config);

  const { data: game, error } = await client.from('games').insert({ name: args.name ?? names.join(', '), config }).select('id').single();
  if (error || !game) throw new Error(explain('Creating the game', error?.message ?? 'no row'));
  const gameId = (game as { id: string }).id;

  try {
    const tokens = config.players.map(() => newToken());
    const seats = config.players.map((p, i) => ({ game_id: gameId, player_id: p.id, name: p.name, token_hash: tokenHash(tokens[i]!) }));
    const s = await client.from('seats').insert(seats);
    if (s.error) throw new Error(explain('Creating the seats', s.error.message));
    const snap = await client.from('snapshots').insert({ game_id: gameId, week: state.week, state: { ...state, history: [] } });
    if (snap.error) throw new Error(explain('Saving week 1', snap.error.message));

    console.log(`Game created: ${args.name ?? names.join(', ')} (${config.townId} map, seed ${config.seed})`);
    console.log(`Game id: ${gameId}\n`);
    console.log('Send each person their own link. Each works on one device only.\n');
    config.players.forEach((p, i) => console.log(`${p.name}:\n  ${inviteLink(site, tokens[i]!)}\n`));
  } catch (e) {
    await client.from('games').delete().eq('id', gameId); // seats and snapshots go with it
    throw e;
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

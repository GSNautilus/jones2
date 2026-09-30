/**
 * List the online games: id, week, and each seat with whether a device has
 * claimed it.
 *
 *   npm run list-games -w @jones2/host
 */
import { adminClient, explain } from './admin';

interface Row {
  id: string;
  name: string;
  week: number;
  status: string;
  created_at: string;
  seats: { player_id: string; name: string; claimed_at: string | null }[];
}

async function main(): Promise<void> {
  const client = adminClient();
  const { data, error } = await client
    .from('games')
    .select('id, name, week, status, created_at, seats(player_id, name, claimed_at)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(explain('Listing games', error.message));
  const games = (data ?? []) as Row[];
  if (games.length === 0) console.log('No games yet. Make one with: npm run new-game -w @jones2/host -- --players "Ann,Bob"');
  for (const g of games) {
    console.log(`${g.name}  (week ${g.week}, ${g.status}, started ${g.created_at.slice(0, 10)})`);
    console.log(`  id ${g.id}`);
    for (const s of [...g.seats].sort((a, b) => a.player_id.localeCompare(b.player_id))) {
      console.log(`  ${s.player_id}  ${s.name.padEnd(20)} ${s.claimed_at ? `joined ${s.claimed_at.slice(0, 10)}` : 'link not opened yet'}`);
    }
    console.log('');
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

/**
 * Print a new host link. Opening it on a device makes that device a host
 * device: on the site it can create online games, list them, copy and replace
 * player links, and delete games. Open it on each device you host from.
 *
 *   npm run host-link -w @jones2/host
 *
 * Running it again replaces the link and signs every host device out (use it
 * if the host link ever reaches someone it should not).
 */
import { adminClient, checkReachable, explain, projectUrl } from './admin';
import { DEFAULT_SITE, hostLink, newToken, parseArgs, tokenHash } from './games';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const client = adminClient();
  const unreachable = await checkReachable(projectUrl());
  if (unreachable) throw new Error(unreachable);
  const token = newToken();
  const devices = await client.from('host_devices').delete().not('user_id', 'is', null);
  if (devices.error) throw new Error(explain('Signing out the old host devices', devices.error.message));
  const keys = await client.from('host_keys').delete().not('token_hash', 'is', null);
  if (keys.error) throw new Error(explain('Retiring the old host link', keys.error.message));
  const add = await client.from('host_keys').insert({ token_hash: tokenHash(token) });
  if (add.error) throw new Error(explain('Saving the host link', add.error.message));
  console.log('Your host link. Open it on each device you want to host from, then keep it private:');
  console.log('it lets whoever holds it create games and see every player link.\n');
  console.log(`  ${hostLink(args.site ?? DEFAULT_SITE, token)}\n`);
  console.log('Any earlier host link no longer works, and devices it opened are no longer hosts.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

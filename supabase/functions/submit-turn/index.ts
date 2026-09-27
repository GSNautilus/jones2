// submit-turn: a player hands in their week. Everything but the wiring lives in
// packages/server (bundled into ../_shared/server.js by `npm run bundle -w @jones2/server`).
import postgres from 'npm:postgres@3';
import { authLookup, handle, postgresJsDb, publishableKey } from '../_shared/server.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false });
const db = postgresJsDb(sql);
const whoIs = authLookup(Deno.env.get('SUPABASE_URL')!, publishableKey(Deno.env));

Deno.serve((req: Request) => handle(req, { db, whoIs }));

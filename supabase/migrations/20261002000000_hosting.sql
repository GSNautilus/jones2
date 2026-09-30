-- Hosting from the site (DESIGN decision log 2026-10-02). The host's own link
-- (`#/hostkey/<token>`, printed once by `npm run host-link -w @jones2/host`)
-- makes each device that opens it a host device. Host devices create games,
-- list them, copy and replace player links, and delete games, all through the
-- functions below; nobody else can. Any seat unlocks the audio, so only a host
-- may mint seats.

-- The host link, stored as sha256 like the player links. The host tool keeps one.
create table public.host_keys (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table public.host_devices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Player links are kept (column `link`; not `token`, which would shadow
-- redeem_seat's parameter) so a host device can show them again. Only the host
-- functions return them; the seats grant to players does not include this column.
alter table public.seats add column link text;

revoke all on public.host_keys, public.host_devices from anon, authenticated;
alter table public.host_keys enable row level security;
alter table public.host_devices enable row level security;

create function public.is_host() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.host_devices h where h.user_id = auth.uid());
$$;

-- A new, unguessable, URL-safe token: two random UUIDs (244 random bits), base64url.
create function public.new_link_token() returns text
language sql volatile set search_path = ''
as $$
  select rtrim(translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=');
$$;

create function public.link_hash(token text) returns text
language sql immutable set search_path = ''
as $$
  select encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Opening the host link: this session becomes a host device.
create function public.redeem_host(token text) returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in before opening the host link' using errcode = '28000';
  end if;
  if not exists (select 1 from public.host_keys k where k.token_hash = public.link_hash(token)) then
    raise exception 'unknown host link' using errcode = 'P0002';
  end if;
  insert into public.host_devices (user_id) values (uid) on conflict do nothing;
  return true;
end;
$$;

create function public.require_host() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_host() then
    raise exception 'only the host can do that' using errcode = '42501';
  end if;
end;
$$;

-- Create an online game. The host's browser builds the week-1 state with the
-- sim (createGame is deterministic from the config); the host is trusted, but
-- the state must at least belong to this config and start at week 1.
create function public.host_create_game(p_name text, p_config jsonb, p_state jsonb)
returns table (game_id uuid, player_id text, name text, token text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  g uuid;
  p jsonb;
  t text;
begin
  perform public.require_host();
  if p_config->>'ruleset' is distinct from 'classic' then
    raise exception 'online games use the classic rules' using errcode = '22023';
  end if;
  if jsonb_typeof(p_config->'players') is distinct from 'array'
     or jsonb_array_length(p_config->'players') not between 1 and 4 then
    raise exception 'a game has one to four players' using errcode = '22023';
  end if;
  if (p_state->'config') is distinct from p_config or (p_state->>'week') is distinct from '1' then
    raise exception 'the starting state does not match the settings' using errcode = '22023';
  end if;

  insert into public.games (name, config) values (coalesce(nullif(trim(p_name), ''), 'Family game'), p_config)
    returning id into g;
  for p in select * from jsonb_array_elements(p_config->'players') loop
    t := public.new_link_token();
    insert into public.seats (game_id, player_id, name, token_hash, link)
      values (g, p->>'id', p->>'name', public.link_hash(t), t);
  end loop;
  insert into public.snapshots (game_id, week, state)
    values (g, 1, jsonb_set(p_state, '{history}', '[]'::jsonb));

  return query select s.game_id, s.player_id, s.name, s.link
    from public.seats s where s.game_id = g order by s.player_id;
end;
$$;

create function public.host_games()
returns table (game_id uuid, name text, week integer, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_host();
  return query select gm.id, gm.name, gm.week, gm.status, gm.created_at from public.games gm order by gm.created_at desc;
end;
$$;

-- A game's seats for the host: the link (null for seats made before links were
-- kept; replace it to get one), how many devices use it, and whether the open
-- week is handed in.
create function public.host_seats(g uuid)
returns table (player_id text, name text, token text, devices integer, submitted boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_host();
  return query
    select s.player_id, s.name, s.link,
           (select count(*)::int from public.seat_devices d where d.game_id = s.game_id and d.player_id = s.player_id),
           exists (select 1 from public.turns t join public.games gm on gm.id = t.game_id
                    where t.game_id = s.game_id and t.player_id = s.player_id and t.week = gm.week and t.submitted_at is not null)
      from public.seats s where s.game_id = g order by s.player_id;
end;
$$;

-- A link that reached the wrong person: a new one, and every device on the old one signed out.
create function public.host_replace_link(g uuid, pid text) returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  t text := public.new_link_token();
begin
  perform public.require_host();
  update public.seats set link = t, token_hash = public.link_hash(t), claimed_at = null
    where game_id = g and player_id = pid;
  if not found then
    raise exception 'no such seat' using errcode = 'P0002';
  end if;
  delete from public.seat_devices where game_id = g and player_id = pid;
  return t;
end;
$$;

create function public.host_delete_game(g uuid) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform public.require_host();
  delete from public.games where id = g; -- seats, devices, snapshots and turns go with it
end;
$$;

revoke all on function public.is_host(), public.new_link_token(), public.link_hash(text), public.redeem_host(text),
  public.require_host(), public.host_create_game(text, jsonb, jsonb), public.host_games(), public.host_seats(uuid),
  public.host_replace_link(uuid, text), public.host_delete_game(uuid) from public, anon;
grant execute on function public.is_host(), public.redeem_host(text), public.host_create_game(text, jsonb, jsonb),
  public.host_games(), public.host_seats(uuid), public.host_replace_link(uuid, text), public.host_delete_game(uuid)
  to authenticated;

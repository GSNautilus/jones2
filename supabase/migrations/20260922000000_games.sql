-- Jones 2: games, seats, week snapshots and turns (DESIGN decision log 2026-09-22).
--
-- Who can do what:
--   * Nobody signed out (role anon) can read or write anything.
--   * A signed-in session (anonymous sign-in, role authenticated) holds a seat
--     once it has redeemed that seat's invite token with redeem_seat().
--   * A seated session reads its games, their seats (names only), their week
--     snapshots, its own turns, and everyone's turns once that week is over.
--   * It writes only its own seat's turn for the open week, only the action
--     list, and only until the turn is submitted.
--   * Games, seats, snapshots and submitting are the host tools' and the Edge
--     Function's business: they use the secret key (role service_role), which
--     bypasses row level security.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  -- The sim's GameConfig.
  config jsonb not null,
  -- The open week: turns are played against snapshots(week).
  week integer not null default 1 check (week >= 1),
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now()
);

create table public.seats (
  game_id uuid not null references public.games (id) on delete cascade,
  -- The sim's PlayerId.
  player_id text not null,
  name text not null,
  -- sha256 hex of the invite token; the token itself is never stored.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- The session that redeemed the token. Null until then; the host clears it to re-issue.
  user_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  primary key (game_id, player_id)
);
create index seats_user_id on public.seats (user_id);

create table public.snapshots (
  game_id uuid not null references public.games (id) on delete cascade,
  week integer not null check (week >= 1),
  -- The sim's GameState at the start of the week.
  state jsonb not null,
  -- The sim's WeekReport for the week that produced this one (null for week 1).
  report jsonb,
  created_at timestamptz not null default now(),
  -- One snapshot per week: two resolutions racing for the same week cannot both land.
  primary key (game_id, week)
);

create table public.turns (
  game_id uuid not null,
  week integer not null,
  player_id text not null,
  -- The sim's Action[], in the order played.
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  -- Set by the Edge Function once it has replayed and accepted the actions.
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (game_id, week, player_id),
  foreign key (game_id, player_id) references public.seats (game_id, player_id) on delete cascade,
  foreign key (game_id, week) references public.snapshots (game_id, week) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Helpers. Security definer so policies can ask about seats without the
-- seats policy recursing; each is a plain lookup on auth.uid().
-- ---------------------------------------------------------------------------

create function public.is_seated(g uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seats s where s.game_id = g and s.user_id = auth.uid());
$$;

create function public.owns_seat(g uuid, pid text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seats s where s.game_id = g and s.player_id = pid and s.user_id = auth.uid());
$$;

-- Any seat in any game: the gate on the original game's files.
create function public.has_seat() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seats s where s.user_id = auth.uid());
$$;

create function public.open_week(g uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select gm.week from public.games gm where gm.id = g;
$$;

-- The seats this session holds (several when a family shares one device).
create function public.my_seats() returns table (game_id uuid, player_id text, name text)
language sql stable security definer set search_path = ''
as $$
  select s.game_id, s.player_id, s.name from public.seats s where s.user_id = auth.uid();
$$;

-- Claim the seat an invite token names for this session. Idempotent for the
-- session that already holds it; refused for any other.
create function public.redeem_seat(token text) returns table (game_id uuid, player_id text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s public.seats;
begin
  if uid is null then
    raise exception 'sign in before redeeming an invite' using errcode = '28000';
  end if;
  select * into s from public.seats
    where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
    for update;
  if not found then
    raise exception 'unknown invite' using errcode = 'P0002';
  end if;
  if s.user_id is not null and s.user_id <> uid then
    raise exception 'this invite has already been used on another device' using errcode = '42501';
  end if;
  update public.seats
    set user_id = uid, claimed_at = coalesce(claimed_at, now())
    where seats.game_id = s.game_id and seats.player_id = s.player_id;
  return query select s.game_id, s.player_id;
end;
$$;

create function public.touch_turn() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger turns_touch before update on public.turns
  for each row execute function public.touch_turn();

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants everything on new public tables to anon and
-- authenticated by default; take it all back and grant only what is used.
-- ---------------------------------------------------------------------------

revoke all on public.games, public.seats, public.snapshots, public.turns from anon, authenticated;
revoke all on function public.is_seated(uuid), public.owns_seat(uuid, text), public.has_seat(),
  public.open_week(uuid), public.my_seats(), public.redeem_seat(text) from public, anon;

grant select on public.games, public.snapshots to authenticated;
-- Seats: names only. Token hashes and session ids stay hidden.
grant select (game_id, player_id, name, claimed_at) on public.seats to authenticated;
grant select on public.turns to authenticated;
grant insert (game_id, week, player_id, actions) on public.turns to authenticated;
grant update (actions) on public.turns to authenticated;
grant execute on function public.is_seated(uuid), public.owns_seat(uuid, text), public.has_seat(),
  public.open_week(uuid), public.my_seats(), public.redeem_seat(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.games enable row level security;
alter table public.seats enable row level security;
alter table public.snapshots enable row level security;
alter table public.turns enable row level security;

create policy "seated players read their games" on public.games
  for select to authenticated using (public.is_seated(id));

create policy "seated players read their games' seats" on public.seats
  for select to authenticated using (public.is_seated(game_id));

create policy "seated players read their games' snapshots" on public.snapshots
  for select to authenticated using (public.is_seated(game_id));

-- Own turns always; everyone else's only once the week has resolved, so
-- nobody sees a rival's job applications before the contest is settled.
create policy "players read own turns and finished weeks" on public.turns
  for select to authenticated using (
    public.owns_seat(game_id, player_id)
    or (public.is_seated(game_id) and week < public.open_week(game_id))
  );

create policy "players start their own turn in the open week" on public.turns
  for insert to authenticated with check (
    public.owns_seat(game_id, player_id)
    and week = public.open_week(game_id)
    and submitted_at is null
  );

create policy "players edit their own unsubmitted turn" on public.turns
  for update to authenticated
  using (public.owns_seat(game_id, player_id) and week = public.open_week(game_id) and submitted_at is null)
  with check (public.owns_seat(game_id, player_id) and week = public.open_week(game_id) and submitted_at is null);

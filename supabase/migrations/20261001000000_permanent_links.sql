-- Permanent invite links (DESIGN decision log 2026-10-01). A player's link is
-- their key: every device that opens it joins their seat, as often as they
-- like. Re-issuing the seat (host tools) changes the token and signs every one
-- of those devices out of it.

create table public.seat_devices (
  game_id uuid not null,
  player_id text not null,
  -- An anonymous session on one browser that opened the seat's link.
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (game_id, player_id, user_id),
  foreign key (game_id, player_id) references public.seats (game_id, player_id) on delete cascade
);
create index seat_devices_user_id on public.seat_devices (user_id);

-- Whoever held a seat keeps it.
insert into public.seat_devices (game_id, player_id, user_id)
  select game_id, player_id, user_id from public.seats where user_id is not null;

-- Nobody reads or writes this directly; the functions below do.
revoke all on public.seat_devices from anon, authenticated;
alter table public.seat_devices enable row level security;

create or replace function public.is_seated(g uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seat_devices d where d.game_id = g and d.user_id = auth.uid());
$$;

create or replace function public.owns_seat(g uuid, pid text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seat_devices d where d.game_id = g and d.player_id = pid and d.user_id = auth.uid());
$$;

create or replace function public.has_seat() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.seat_devices d where d.user_id = auth.uid());
$$;

create or replace function public.my_seats() returns table (game_id uuid, player_id text, name text)
language sql stable security definer set search_path = ''
as $$
  select s.game_id, s.player_id, s.name
    from public.seat_devices d
    join public.seats s on s.game_id = d.game_id and s.player_id = d.player_id
   where d.user_id = auth.uid();
$$;

-- Add this session to the seat the token names. Any number of devices, any
-- number of times; an unknown (or replaced) token is refused.
create or replace function public.redeem_seat(token text) returns table (game_id uuid, player_id text)
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
    where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if not found then
    raise exception 'unknown invite' using errcode = 'P0002';
  end if;
  insert into public.seat_devices (game_id, player_id, user_id)
    values (s.game_id, s.player_id, uid)
    on conflict do nothing;
  update public.seats
    set claimed_at = coalesce(claimed_at, now())
    where seats.game_id = s.game_id and seats.player_id = s.player_id;
  return query select s.game_id, s.player_id;
end;
$$;

-- The one-device column is gone; seat_devices replaces it.
alter table public.seats drop column user_id;

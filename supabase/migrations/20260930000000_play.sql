-- What the online client needs beyond reading its tables (Milestone 3 step 5).

-- Save the player's week in progress, so a closed tab or a second device
-- picks it up. Only their own seat, only the open week, only until the Edge
-- Function has taken the turn. (A plain upsert from the client would also try
-- to update the key columns, which players may not write.)
create function public.save_draft(g uuid, w integer, pid text, draft jsonb) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.owns_seat(g, pid) then
    raise exception 'that seat is not yours' using errcode = '42501';
  end if;
  if w is distinct from public.open_week(g) then
    raise exception 'week % is not open', w using errcode = '22023';
  end if;
  if jsonb_typeof(draft) is distinct from 'array' then
    raise exception 'a draft is a list of actions' using errcode = '22023';
  end if;
  insert into public.turns (game_id, week, player_id, actions)
    values (g, w, pid, draft)
    on conflict (game_id, week, player_id) do update
      set actions = excluded.actions
      where public.turns.submitted_at is null;
end;
$$;

-- Who has handed in the open week: names and a flag, never the actions.
create function public.week_status(g uuid) returns table (player_id text, name text, submitted boolean)
language sql stable security definer set search_path = ''
as $$
  select s.player_id, s.name,
         exists (select 1 from public.turns t
                  where t.game_id = s.game_id and t.player_id = s.player_id
                    and t.week = gm.week and t.submitted_at is not null)
    from public.seats s join public.games gm on gm.id = s.game_id
   where s.game_id = g and public.is_seated(g)
   order by s.player_id;
$$;

-- The keep-alive's target: a free project with no database activity for a
-- week is paused. Callable signed out; reveals nothing.
create function public.ping() returns text
language sql stable set search_path = ''
as $$ select 'pong'::text $$;

revoke all on function public.save_draft(uuid, integer, text, jsonb), public.week_status(uuid) from public, anon;
grant execute on function public.save_draft(uuid, integer, text, jsonb), public.week_status(uuid) to authenticated;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- 아무거나요㈜ — Supabase 스키마
--
-- 로그인이 없는 사내용 장난감이라 접근 방식은 단순하다.
--   · 테이블은 RLS 를 켜고 정책을 두지 않는다 → 공개 키로는 직접 읽고 쓸 수 없다.
--   · 모든 읽기·쓰기는 아래 함수(security definer)로만 한다. 함수가 길이·횟수를 검사한다.
--   · 사람은 기기에서 만든 uuid 로 구분한다. 이 uuid 는 남에게 보여주지 않는다.
-- 다시 실행해도 되도록 썼다.

-- ── 테이블 ────────────────────────────────────────────────

create table if not exists public.players (
  id uuid primary key,
  nickname text check (nickname is null or char_length(nickname) between 1 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.plays (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  day date not null,
  scenario text not null,
  ending text not null,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists plays_day_idx on public.plays (day, scenario);
create index if not exists plays_player_idx on public.plays (player_id);

create table if not exists public.rooms (
  code text primary key,
  title text not null,
  owner_id uuid not null references public.players (id) on delete cascade,
  anonymous boolean not null default false,
  winner_option_id bigint,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.room_options (
  id bigint generated always as identity primary key,
  room_code text not null references public.rooms (code) on delete cascade,
  label text not null,
  position int not null
);
create index if not exists room_options_room_idx on public.room_options (room_code);

create table if not exists public.room_votes (
  room_code text not null references public.rooms (code) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  option_id bigint not null references public.room_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_code, player_id)
);
create index if not exists room_votes_option_idx on public.room_votes (option_id);

alter table public.players enable row level security;
alter table public.plays enable row level security;
alter table public.rooms enable row level security;
alter table public.room_options enable row level security;
alter table public.room_votes enable row level security;

revoke all on public.players, public.plays, public.rooms, public.room_options, public.room_votes
  from anon, authenticated;

-- ── 공통 ─────────────────────────────────────────────────

create or replace function public._today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Seoul')::date $$;

-- 기기 uuid 를 등록하고, 닉네임이 왔으면 갱신한다.
create or replace function public._touch_player(p_player uuid, p_nickname text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nick text := nullif(left(btrim(coalesce(p_nickname, '')), 12), '');
begin
  if p_player is null then
    raise exception 'player required';
  end if;
  insert into players (id, nickname) values (p_player, v_nick)
  on conflict (id) do update set nickname = coalesce(excluded.nickname, players.nickname);
end $$;

-- ── 게임 기록 · 통계 · 랭킹 ────────────────────────────────

create or replace function public.record_play(
  p_player uuid, p_nickname text, p_scenario text, p_ending text, p_path text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ending not in ('master', 'pusher', 'democracy', 'interview', 'follower', 'soup') then
    raise exception 'unknown ending';
  end if;
  if char_length(coalesce(p_scenario, '')) not between 1 and 8 then
    raise exception 'bad scenario';
  end if;
  perform _touch_player(p_player, p_nickname);
  -- 한 사람이 하루에 남길 수 있는 기록 수를 막아 둔다
  if (select count(*) from plays where player_id = p_player and day = _today()) >= 200 then
    return;
  end if;
  insert into plays (player_id, day, scenario, ending, path)
  values (p_player, _today(), p_scenario, p_ending, left(p_path, 120));
end $$;

-- 오늘의 엔딩 분포. 다시 하면 얼마든지 바뀌므로 각자의 '첫 판'만 센다.
create or replace function public.day_stats(p_scenario text) returns json
language sql stable security definer set search_path = public as $$
  with first_play as (
    select distinct on (player_id) player_id, ending
    from plays
    where day = _today() and scenario = p_scenario
    order by player_id, created_at
  )
  select json_build_object(
    'players', (select count(*) from first_play),
    'endings', coalesce(
      (select json_object_agg(ending, c)
       from (select ending, count(*) as c from first_play group by ending) t),
      '{}'::json)
  );
$$;

-- 엔딩 수집 순위. 닉네임을 적은 사람만 나온다. 같은 수면 덜 해본 사람이 위.
create or replace function public.ranking() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select p.nickname,
           count(distinct pl.ending) as endings,
           count(*) as plays
    from plays pl
    join players p on p.id = pl.player_id
    where p.nickname is not null
    group by p.id, p.nickname
    order by count(distinct pl.ending) desc, count(*) asc, min(pl.created_at) asc
    limit 20
  ) t;
$$;

-- ── 진짜 점심 투표방 ───────────────────────────────────────

create or replace function public.create_room(
  p_player uuid, p_nickname text, p_title text, p_options text[], p_anonymous boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_title text := left(btrim(coalesce(p_title, '')), 30);
  v_opts text[];
  v_code text;
  v_chars constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  select array_agg(o order by ord) into v_opts
  from (
    select left(btrim(x), 20) as o, min(ord) as ord
    from unnest(p_options) with ordinality as u (x, ord)
    where btrim(coalesce(x, '')) <> ''
    group by 1
  ) s;

  if v_title = '' then raise exception 'title required'; end if;
  if coalesce(array_length(v_opts, 1), 0) not between 2 and 6 then
    raise exception 'need 2 to 6 options';
  end if;

  perform _touch_player(p_player, p_nickname);
  if (select count(*) from rooms where owner_id = p_player and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many rooms today';
  end if;

  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = v_code);
  end loop;

  insert into rooms (code, title, owner_id, anonymous) values (v_code, v_title, p_player, coalesce(p_anonymous, false));
  insert into room_options (room_code, label, position)
  select v_code, o, ord from unnest(v_opts) with ordinality as u (o, ord);
  return v_code;
end $$;

-- 방 상태. 익명 방은 마감 전까지 표 수를 숨기고, 누가 찍었는지는 끝까지 숨긴다.
create or replace function public.get_room(p_code text, p_player uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'code', r.code,
    'title', r.title,
    'anonymous', r.anonymous,
    'closed', r.closed_at is not null,
    'winner', r.winner_option_id,
    'owner', r.owner_id = p_player,
    'ownerName', (select nickname from players where id = r.owner_id),
    'myVote', (select option_id from room_votes where room_code = r.code and player_id = p_player),
    'total', (select count(*) from room_votes where room_code = r.code),
    'options', (
      select json_agg(json_build_object(
        'id', o.id,
        'label', o.label,
        'count', case when r.anonymous and r.closed_at is null then null
                      else (select count(*) from room_votes v where v.option_id = o.id) end,
        'voters', case when r.anonymous then null
                       else (select coalesce(json_agg(coalesce(p.nickname, '이름 없음') order by v.created_at), '[]'::json)
                             from room_votes v join players p on p.id = v.player_id
                             where v.option_id = o.id) end
      ) order by o.position)
      from room_options o where o.room_code = r.code)
  )
  from rooms r
  where r.code = lower(btrim(p_code));
$$;

-- 마감 전에는 몇 번이든 바꿔 찍을 수 있다.
create or replace function public.cast_vote(
  p_code text, p_player uuid, p_nickname text, p_option bigint
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code text := lower(btrim(p_code));
begin
  if not exists (select 1 from rooms where code = v_code and closed_at is null) then
    raise exception 'room closed or missing';
  end if;
  if not exists (select 1 from room_options where id = p_option and room_code = v_code) then
    raise exception 'bad option';
  end if;
  perform _touch_player(p_player, p_nickname);
  insert into room_votes (room_code, player_id, option_id) values (v_code, p_player, p_option)
  on conflict (room_code, player_id) do update set option_id = excluded.option_id, created_at = now();
  return get_room(v_code, p_player);
end $$;

-- 방 만든 사람만 마감한다. 동률이면 방장이 그중 하나를 골라(p_pick) 다시 부른다.
create or replace function public.close_room(
  p_code text, p_player uuid, p_pick bigint default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code text := lower(btrim(p_code));
  v_tied bigint[];
begin
  if not exists (select 1 from rooms where code = v_code and owner_id = p_player and closed_at is null) then
    raise exception 'not allowed';
  end if;

  select array_agg(option_id) into v_tied
  from (
    select option_id, rank() over (order by count(*) desc) as rk
    from room_votes where room_code = v_code group by option_id
  ) t
  where rk = 1;

  if v_tied is null then
    raise exception 'no votes yet';
  end if;

  if array_length(v_tied, 1) > 1 then
    if p_pick is null or not (p_pick = any (v_tied)) then
      return json_build_object('tie', v_tied);
    end if;
    update rooms set winner_option_id = p_pick, closed_at = now() where code = v_code;
  else
    update rooms set winner_option_id = v_tied[1], closed_at = now() where code = v_code;
  end if;
  return get_room(v_code, p_player);
end $$;

-- ── 권한 ─────────────────────────────────────────────────

revoke execute on function public._touch_player(uuid, text) from public, anon, authenticated;

grant execute on function
  public.record_play(uuid, text, text, text, text),
  public.day_stats(text),
  public.ranking(),
  public.create_room(uuid, text, text, text[], boolean),
  public.get_room(text, uuid),
  public.cast_vote(text, uuid, text, bigint),
  public.close_room(text, uuid, bigint)
to anon, authenticated;

notify pgrst, 'reload schema';

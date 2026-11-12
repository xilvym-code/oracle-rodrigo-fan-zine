create table if not exists public.community_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_active_at timestamptz not null default pg_catalog.clock_timestamp()
);

alter table public.community_presence enable row level security;
revoke all on table public.community_presence from public, anon;
grant select on table public.community_presence to authenticated;

drop policy if exists "Signed-in users can read community presence" on public.community_presence;
create policy "Signed-in users can read community presence"
  on public.community_presence for select to authenticated
  using (true);

insert into public.community_presence (user_id, last_active_at)
select id, last_sign_in_at
from auth.users
where last_sign_in_at is not null
on conflict (user_id) do nothing;

create or replace function public.touch_community_presence()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_at timestamptz := pg_catalog.clock_timestamp();
  user_id uuid := auth.uid();
begin
  if user_id is null then
    raise exception 'Authentication is required to update presence.'
      using errcode = '42501';
  end if;

  insert into public.community_presence (user_id, last_active_at)
  values (user_id, active_at)
  on conflict (user_id) do update
  set last_active_at = excluded.last_active_at;

  return active_at;
end;
$$;

revoke all on function public.touch_community_presence() from public, anon;
grant execute on function public.touch_community_presence() to authenticated;

create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint direct_messages_different_participants_check
    check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_created_at_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_created_at_idx
  on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;
revoke all on table public.direct_messages from public, anon;
grant select, insert on table public.direct_messages to authenticated;
revoke all on sequence public.direct_messages_id_seq from public, anon;
grant usage, select on sequence public.direct_messages_id_seq to authenticated;

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages"
  on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send direct messages as themselves" on public.direct_messages;
create policy "Users can send direct messages as themselves"
  on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

create or replace function public.enforce_direct_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.sender_id::text, 0)
  );

  if exists (
    select 1
    from public.direct_messages as message
    where message.sender_id = new.sender_id
      and message.created_at > pg_catalog.clock_timestamp() - interval '2 seconds'
  ) then
    raise exception 'Please wait before sending another message.'
      using errcode = 'P0001';
  end if;

  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke all on function public.enforce_direct_message_rate_limit() from public, anon;
grant execute on function public.enforce_direct_message_rate_limit() to authenticated;

drop trigger if exists direct_messages_rate_limit on public.direct_messages;
create trigger direct_messages_rate_limit
  before insert on public.direct_messages
  for each row execute function public.enforce_direct_message_rate_limit();

update storage.buckets
set allowed_mime_types = coalesce(allowed_mime_types, array[]::text[])
  || case
       when 'application/octet-stream' = any(coalesce(allowed_mime_types, array[]::text[]))
       then array[]::text[]
       else array['application/octet-stream']::text[]
     end
where id = 'community-chat-files';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_presence'
  ) then
    alter publication supabase_realtime add table public.community_presence;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end
$$;

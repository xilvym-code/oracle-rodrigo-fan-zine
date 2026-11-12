create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);
create index if not exists chat_messages_user_created_at_idx
  on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on table public.chat_messages from anon;
grant select, insert, delete on table public.chat_messages to authenticated;
revoke all on sequence public.chat_messages_id_seq from public, anon;
grant usage, select on sequence public.chat_messages_id_seq to authenticated;

drop policy if exists "Signed-in users can read chat messages" on public.chat_messages;
create policy "Signed-in users can read chat messages"
  on public.chat_messages for select to authenticated
  using (true);

drop policy if exists "Users can post their own chat messages" on public.chat_messages;
create policy "Users can post their own chat messages"
  on public.chat_messages for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
  on public.chat_messages for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.enforce_chat_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  if exists (
    select 1
    from public.chat_messages as message
    where message.user_id = new.user_id
      and message.created_at > pg_catalog.clock_timestamp() - interval '2 seconds'
  ) then
    raise exception 'Please wait before sending another message.'
      using errcode = 'P0001';
  end if;

  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke all on function public.enforce_chat_message_rate_limit() from public, anon;
grant execute on function public.enforce_chat_message_rate_limit() to authenticated;

drop trigger if exists chat_messages_rate_limit on public.chat_messages;
create trigger chat_messages_rate_limit
  before insert on public.chat_messages
  for each row execute function public.enforce_chat_message_rate_limit();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;

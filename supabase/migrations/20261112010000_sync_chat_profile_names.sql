create or replace function public.enforce_chat_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
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

  select nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'display_name'), '')
  into profile_name
  from auth.users as auth_user
  where auth_user.id = new.user_id;

  new.display_name := pg_catalog.left(
    coalesce(profile_name, 'Fan ' || pg_catalog.left(new.user_id::text, 6)),
    40
  );
  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create or replace function public.sync_chat_display_name_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  chat_name text;
begin
  profile_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '');
  chat_name := pg_catalog.left(
    coalesce(profile_name, 'Fan ' || pg_catalog.left(new.id::text, 6)),
    40
  );

  update public.chat_messages
  set display_name = chat_name
  where user_id = new.id
    and display_name is distinct from chat_name;

  return new;
end;
$$;

revoke all on function public.sync_chat_display_name_from_auth() from public, anon, authenticated;

update public.chat_messages as message
set display_name = pg_catalog.left(
  coalesce(
    nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
    'Fan ' || pg_catalog.left(auth_user.id::text, 6)
  ),
  40
)
from auth.users as auth_user
where auth_user.id = message.user_id
  and message.display_name is distinct from pg_catalog.left(
    coalesce(
      nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      'Fan ' || pg_catalog.left(auth_user.id::text, 6)
    ),
    40
  );

drop trigger if exists sync_chat_display_name on auth.users;
create trigger sync_chat_display_name
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sync_chat_display_name_from_auth();

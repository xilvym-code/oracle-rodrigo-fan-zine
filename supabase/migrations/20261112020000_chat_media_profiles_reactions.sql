create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url text check (
    avatar_url is null
    or (
      avatar_url like 'data:image/jpeg;base64,%'
      and char_length(avatar_url) <= 1000000
    )
  ),
  updated_at timestamptz not null default now()
);

alter table public.community_profiles enable row level security;
revoke all on table public.community_profiles from public, anon;
grant select on table public.community_profiles to authenticated;

drop policy if exists "Signed-in users can read community profiles" on public.community_profiles;
create policy "Signed-in users can read community profiles"
  on public.community_profiles for select to authenticated
  using (true);

create or replace function public.sync_chat_display_name_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar text;
  chat_name text;
begin
  profile_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '');
  chat_name := pg_catalog.left(
    coalesce(profile_name, 'Fan ' || pg_catalog.left(new.id::text, 6)),
    40
  );
  profile_avatar := new.raw_user_meta_data ->> 'avatar_url';
  if profile_avatar is not null
     and (
       profile_avatar not like 'data:image/jpeg;base64,%'
       or char_length(profile_avatar) > 1000000
     ) then
    profile_avatar := null;
  end if;

  insert into public.community_profiles (user_id, display_name, avatar_url, updated_at)
  values (new.id, chat_name, profile_avatar, pg_catalog.clock_timestamp())
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at;

  update public.chat_messages
  set display_name = chat_name
  where user_id = new.id
    and display_name is distinct from chat_name;

  return new;
end;
$$;

revoke all on function public.sync_chat_display_name_from_auth() from public, anon, authenticated;

insert into public.community_profiles (user_id, display_name, avatar_url, updated_at)
select
  auth_user.id,
  pg_catalog.left(
    coalesce(
      nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      'Fan ' || pg_catalog.left(auth_user.id::text, 6)
    ),
    40
  ),
  case
    when auth_user.raw_user_meta_data ->> 'avatar_url' like 'data:image/jpeg;base64,%'
      and char_length(auth_user.raw_user_meta_data ->> 'avatar_url') <= 1000000
    then auth_user.raw_user_meta_data ->> 'avatar_url'
    else null
  end,
  pg_catalog.clock_timestamp()
from auth.users as auth_user
on conflict (user_id) do update
set display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at;

drop trigger if exists sync_chat_display_name on auth.users;
drop trigger if exists sync_chat_display_name_on_insert on auth.users;
create trigger sync_chat_display_name_on_insert
  after insert on auth.users
  for each row execute function public.sync_chat_display_name_from_auth();

drop trigger if exists sync_chat_display_name_on_update on auth.users;
create trigger sync_chat_display_name_on_update
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sync_chat_display_name_from_auth();

alter table public.chat_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists gif_id text,
  add column if not exists gif_url text;

alter table public.chat_messages
  drop constraint if exists chat_messages_body_check,
  drop constraint if exists chat_messages_attachment_metadata_check,
  drop constraint if exists chat_messages_gif_metadata_check,
  drop constraint if exists chat_messages_attachment_or_gif_check;

alter table public.chat_messages
  add constraint chat_messages_body_check
    check (
      char_length(btrim(body)) <= 500
      and (
        char_length(btrim(body)) > 0
        or attachment_path is not null
        or gif_url is not null
      )
    ),
  add constraint chat_messages_attachment_metadata_check
    check (
      (
        attachment_path is null
        and attachment_name is null
        and attachment_type is null
        and attachment_size is null
      )
      or (
        attachment_path is not null
        and attachment_path like user_id::text || '/%'
        and attachment_name is not null
        and char_length(attachment_name) between 1 and 255
        and attachment_type is not null
        and char_length(attachment_type) <= 150
        and attachment_size between 1 and 10485760
      )
    ),
  add constraint chat_messages_gif_metadata_check
    check (
      (gif_id is null and gif_url is null)
      or (
        gif_id is not null
        and char_length(gif_id) between 1 and 100
        and gif_url is not null
        and gif_url like 'https://%.giphy.com/%'
      )
    ),
  add constraint chat_messages_attachment_or_gif_check
    check (attachment_path is null or gif_url is null);

create table if not exists public.chat_message_reactions (
  message_id bigint not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.chat_message_reactions enable row level security;
revoke all on table public.chat_message_reactions from public, anon;
grant select, insert, delete on table public.chat_message_reactions to authenticated;

drop policy if exists "Signed-in users can read chat reactions" on public.chat_message_reactions;
create policy "Signed-in users can read chat reactions"
  on public.chat_message_reactions for select to authenticated
  using (true);

drop policy if exists "Users can add their own chat reactions" on public.chat_message_reactions;
create policy "Users can add their own chat reactions"
  on public.chat_message_reactions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own chat reactions" on public.chat_message_reactions;
create policy "Users can remove their own chat reactions"
  on public.chat_message_reactions for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-chat-files',
  'community-chat-files',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/rtf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users can read community chat files" on storage.objects;
create policy "Signed-in users can read community chat files"
  on storage.objects for select to authenticated
  using (bucket_id = 'community-chat-files');

drop policy if exists "Users can upload their own community chat files" on storage.objects;
create policy "Users can upload their own community chat files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-chat-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own community chat files" on storage.objects;
create policy "Users can delete their own community chat files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-chat-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_profiles'
  ) then
    alter publication supabase_realtime add table public.community_profiles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_message_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_message_reactions;
  end if;
end
$$;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = null
where id = 'community-chat-files';

alter table public.community_presence
  add column if not exists status_mode text not null default 'online';

alter table public.community_presence
  drop constraint if exists community_presence_status_mode_check;

alter table public.community_presence
  add constraint community_presence_status_mode_check
  check (status_mode in ('online', 'away', 'do_not_disturb', 'offline'));

drop function if exists public.touch_community_presence();

create function public.touch_community_presence(p_status_mode text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_at timestamptz := pg_catalog.clock_timestamp();
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required to update presence.'
      using errcode = '42501';
  end if;

  if p_status_mode is not null
     and p_status_mode not in ('online', 'away', 'do_not_disturb', 'offline') then
    raise exception 'Choose a valid activity status.'
      using errcode = '22023';
  end if;

  insert into public.community_presence (user_id, last_active_at, status_mode)
  values (current_user_id, active_at, coalesce(p_status_mode, 'online'))
  on conflict (user_id) do update
  set last_active_at = excluded.last_active_at,
      status_mode = coalesce(p_status_mode, community_presence.status_mode);

  return active_at;
end;
$$;

revoke all on function public.touch_community_presence(text) from public, anon;
grant execute on function public.touch_community_presence(text) to authenticated;

alter table public.direct_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists gif_id text,
  add column if not exists gif_url text;

alter table public.direct_messages
  drop constraint if exists direct_messages_body_check,
  drop constraint if exists direct_messages_attachment_metadata_check,
  drop constraint if exists direct_messages_gif_metadata_check,
  drop constraint if exists direct_messages_attachment_or_gif_check;

alter table public.direct_messages
  add constraint direct_messages_body_check
    check (
      char_length(btrim(body)) <= 500
      and (
        char_length(btrim(body)) > 0
        or attachment_path is not null
        or gif_url is not null
      )
    ),
  add constraint direct_messages_attachment_metadata_check
    check (
      (
        attachment_path is null
        and attachment_name is null
        and attachment_type is null
        and attachment_size is null
      )
      or (
        attachment_path is not null
        and attachment_path like sender_id::text || '/dm/%'
        and attachment_name is not null
        and char_length(attachment_name) between 1 and 255
        and attachment_type is not null
        and char_length(attachment_type) <= 150
        and attachment_size between 1 and 10485760
      )
    ),
  add constraint direct_messages_gif_metadata_check
    check (
      (gif_id is null and gif_url is null)
      or (
        gif_id is not null
        and char_length(gif_id) between 1 and 100
        and gif_url is not null
        and gif_url like 'https://%.giphy.com/%'
      )
    ),
  add constraint direct_messages_attachment_or_gif_check
    check (attachment_path is null or gif_url is null);

drop policy if exists "Signed-in users can read community chat files" on storage.objects;
create policy "Signed-in users can read community chat files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-chat-files'
    and (
      (storage.foldername(name))[2] is distinct from 'dm'
      or exists (
        select 1
        from public.direct_messages as message
        where message.attachment_path = storage.objects.name
          and auth.uid() in (message.sender_id, message.recipient_id)
      )
    )
  );

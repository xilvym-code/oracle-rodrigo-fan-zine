grant update (avatar_url, updated_at)
  on table public.community_profiles to authenticated;

drop policy if exists "Users can update their own community profile"
  on public.community_profiles;
create policy "Users can update their own community profile"
  on public.community_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

  insert into public.community_profiles (user_id, display_name, updated_at)
  values (new.id, chat_name, pg_catalog.clock_timestamp())
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      updated_at = excluded.updated_at;

  update public.chat_messages
  set display_name = chat_name
  where user_id = new.id
    and display_name is distinct from chat_name;

  return new;
end;
$$;

revoke all on function public.sync_chat_display_name_from_auth()
  from public, anon, authenticated;

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'avatar_url'
where raw_user_meta_data ? 'avatar_url';

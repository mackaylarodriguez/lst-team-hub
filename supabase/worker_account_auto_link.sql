create schema if not exists private;

create or replace function private.handle_new_worker_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(new.email, '')));
  existing_profile_id uuid;
  existing_profile_role text;
  metadata_first_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  metadata_last_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
begin
  if normalized_email = '' then
    return new;
  end if;

  select id, lower(trim(coalesce(role, '')))
  into existing_profile_id, existing_profile_role
  from public.profiles
  where lower(trim(coalesce(email, ''))) = normalized_email
  order by case when id = new.id then 0 else 1 end, id asc
  limit 1;

  if existing_profile_id is null then
    begin
      insert into public.profiles (
        id,
        email,
        role,
        first_name,
        last_name
      )
      values (
        new.id,
        normalized_email,
        'worker',
        metadata_first_name,
        metadata_last_name
      );
    exception
      when unique_violation then
        null;
    end;
  elsif existing_profile_role = '' or existing_profile_role = 'worker' then
    update public.profiles
    set
      email = normalized_email,
      role = case
        when nullif(trim(coalesce(role, '')), '') is null then 'worker'
        else role
      end,
      first_name = coalesce(nullif(trim(coalesce(first_name, '')), ''), metadata_first_name),
      last_name = coalesce(nullif(trim(coalesce(last_name, '')), ''), metadata_last_name)
    where id = existing_profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute procedure private.handle_new_worker_profile();

create or replace function public.claim_worker_account_by_email()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(trim(coalesce(auth.jwt()->>'email', '')));
  claimed_count integer := 0;
  target_profile_id uuid;
begin
  if current_user_id is null or current_email = '' then
    return jsonb_build_object(
      'status', 'missing_identity',
      'claimedTrips', 0
    );
  end if;

  select id
  into target_profile_id
  from public.profiles
  where lower(trim(coalesce(email, ''))) = current_email
  order by case when id = current_user_id then 0 else 1 end, id asc
  limit 1;

  if target_profile_id is null then
    insert into public.profiles (
      id,
      email,
      role,
      first_name,
      last_name
    )
    values (
      current_user_id,
      current_email,
      'worker',
      null,
      null
    )
    on conflict (id) do update
    set email = excluded.email;

    target_profile_id := current_user_id;
  else
    update public.profiles
    set
      email = current_email,
      role = case
        when nullif(trim(coalesce(role, '')), '') is null then 'worker'
        else role
      end
    where id = target_profile_id;
  end if;

  update public.profiles as profile_row
  set
    first_name = coalesce(nullif(profile_row.first_name, ''), source_row.first_name),
    last_name = coalesce(nullif(profile_row.last_name, ''), source_row.last_name)
  from (
    select
      nullif(trim(coalesce(member.first_name, '')), '') as first_name,
      nullif(trim(coalesce(member.last_name, '')), '') as last_name
    from public.trip_team_members as member
    where lower(trim(coalesce(member.email, ''))) = current_email
    order by member.created_at asc nulls last
    limit 1
  ) as source_row
  where profile_row.id = target_profile_id;

  insert into public.trip_assignments (user_id, trip_id)
  select target_profile_id, member.trip_id
  from public.trip_team_members as member
  where lower(trim(coalesce(member.email, ''))) = current_email
    and not exists (
      select 1
      from public.trip_assignments as assignment
      where assignment.user_id = target_profile_id
        and assignment.trip_id = member.trip_id
    );

  get diagnostics claimed_count = row_count;

  return jsonb_build_object(
    'status', 'ok',
    'claimedTrips', claimed_count,
    'profileId', target_profile_id
  );
end;
$$;

grant execute on function public.claim_worker_account_by_email() to authenticated;

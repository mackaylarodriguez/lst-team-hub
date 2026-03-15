create schema if not exists private;

create or replace function private.handle_new_worker_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    lower(trim(coalesce(new.email, ''))),
    'worker',
    null,
    null
  )
  on conflict (id) do nothing;

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
begin
  if current_user_id is null or current_email = '' then
    return jsonb_build_object(
      'status', 'missing_identity',
      'claimedTrips', 0
    );
  end if;

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
  where profile_row.id = current_user_id;

  insert into public.trip_assignments (user_id, trip_id)
  select current_user_id, member.trip_id
  from public.trip_team_members as member
  where lower(trim(coalesce(member.email, ''))) = current_email
    and not exists (
      select 1
      from public.trip_assignments as assignment
      where assignment.user_id = current_user_id
        and assignment.trip_id = member.trip_id
    );

  get diagnostics claimed_count = row_count;

  return jsonb_build_object(
    'status', 'ok',
    'claimedTrips', claimed_count
  );
end;
$$;

grant execute on function public.claim_worker_account_by_email() to authenticated;

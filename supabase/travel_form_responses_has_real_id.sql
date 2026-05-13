-- Optional travel form field for USA Massachusetts (domestic) trips.
alter table public.travel_form_responses
  add column if not exists has_real_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'travel_form_responses'
      and column_name = 'has_real_id'
      and data_type = 'boolean'
  ) then
    alter table public.travel_form_responses
      alter column has_real_id drop default,
      alter column has_real_id type text
        using case
          when has_real_id then 'Yes'
          when not has_real_id then 'No'
          else ''
        end;
  end if;
end $$;

alter table public.travel_form_responses
  alter column has_real_id drop not null;

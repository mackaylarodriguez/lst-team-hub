alter table public.trips
  add column if not exists training_timeline_type text not null default 'standard';

update public.trips
set training_timeline_type = 'standard'
where training_timeline_type is null or trim(training_timeline_type) = '';

alter table public.trips
  alter column training_timeline_type set default 'standard';

alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is 'Participant cell or best contact number (optional).';

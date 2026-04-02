alter table public.trip_team_members
  add column if not exists tshirt_size text;

comment on column public.trip_team_members.tshirt_size is 'T-shirt size for this roster member (e.g. S, M, L, XL).';

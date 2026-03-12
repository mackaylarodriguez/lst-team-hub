alter table public.trips
add column if not exists host text,
add column if not exists site_type text,
add column if not exists has_extra_travel boolean default false,
add column if not exists trip_fee_amount numeric default 0,
add column if not exists materials_fee_amount numeric default 0,
add column if not exists has_deferred_worker boolean default false,
add column if not exists hannover_housing_fee_amount numeric default 0,
add column if not exists domestic_project_fee_amount numeric default 0,
add column if not exists domestic_fee_amount numeric default 0,
add column if not exists domestic_materials_fee_amount numeric default 0;

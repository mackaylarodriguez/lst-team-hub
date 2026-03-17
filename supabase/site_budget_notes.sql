create table if not exists public.site_budget_notes (
  id uuid primary key default gen_random_uuid(),
  site_name text not null unique,
  effective_date date,
  notes text,
  workbook_notes text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index if not exists site_budget_notes_site_name_idx on public.site_budget_notes (site_name);

insert into public.site_budget_notes (site_name, effective_date, notes, workbook_notes) values
('Buenos Aires', '2025-01-01', 'Cost for travel to/from airport is around $50/team each way; $100 total (?). Also, Joel recommends donating $100/team to help with utilities/housing. As of June 2025 we also agreed to provide $200/week when teams stay longer than two weeks. This can be given to Joel, and will be used to help cover the cost of someone being at the building during all work hours while the team is on site.', '6/1/25 Beginner 1 - 0; Beginner 2 - 2; Luke - 19; Acts 1 - 1; Acts 2 - 2; John - 1; Questions - 13; James - 7; Good News - 0; Esther - 0; Origins - 1; Reflections - 1; Heroes - 1;'),
('Hannover, Germany', '2025-01-01', 'Anytime we make a Hannover budget check to see if we need to send money for Angelina (80 euros/month), for advertising expenses at the church, or for work site rental (100 euros/week). Ensure the LST phone has minutes on it (check with Martin Reinhardt) Hannover Housing Fee: $600/person', NULL),
('Krakow', '2025-01-01', 'We''ve agreed to help cover utilities when the team stays at the school; about $100/week.', NULL),
('Lecce', '2025-01-01', 'Transportation to/from - teams departing from Lecce early morning require a shuttle costing approximately $100.', NULL),
('Murcia, Spain', '2025-01-01', 'Travel to/from - approximately 100 euros total to pay for gas; Housing - they will provide but appreciate any money to help cover the cost of water and utilities. $100/week total.', NULL),
('Rio de Janeiro', '2025-01-01', '$50/person/week for housing, $100 total for cleaning (give to the church), and $100/team for transportation to/from (if bigger team $200/team)', NULL),
('Vicenza/Padova', '2025-01-01', 'Housing-need to include money for utilities (electricity/water/gas) - not sure how much yet.', NULL)
on conflict (site_name) do update set
  effective_date = excluded.effective_date,
  notes = excluded.notes,
  workbook_notes = coalesce(excluded.workbook_notes, site_budget_notes.workbook_notes),
  updated_at = now();

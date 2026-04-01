-- One-time cleanup: Trip Documents now use a single slot (smartsheet-budget) for budget + journal.
-- 1) Rename journal-only rows to smartsheet-budget when no budget row exists for that trip.
-- 2) Remove duplicate journal rows when a smartsheet-budget row already exists for the same trip.

update trip_resources tr
set resource_key = 'smartsheet-budget'
where tr.resource_key = 'project-record-journal'
  and not exists (
    select 1
    from trip_resources o
    where o.trip_id = tr.trip_id
      and o.resource_key = 'smartsheet-budget'
      and o.id <> tr.id
  );

delete from trip_resources a
using trip_resources b
where a.resource_key = 'project-record-journal'
  and b.resource_key = 'smartsheet-budget'
  and a.trip_id = b.trip_id;

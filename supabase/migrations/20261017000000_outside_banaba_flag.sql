-- Flag reports sent from outside Barangay Banaba.
--
-- Decided 2026-10-12: flag them, don't reject them. A phone's location can be off by tens of
-- meters, an incident just across the border can still affect Banaba, and a report that waited
-- for signal shouldn't be turned away hours later. Staff see an "Outside Banaba" tag and decide.
--
-- Needs 20261016000000_volume_counts_people.sql first (this replaces its submit_report).

-- ---------------------------------------------------------------------------
-- The barangay's boundary
-- ---------------------------------------------------------------------------

-- Official PSA boundary (PSGC as of 31 Dec 2023), simplified by
-- github.com/faeldon/philippines-json-maps (MIT license). The app and dashboard use the same
-- polygon (packages/shared/src/banabaBoundary.ts); change both together.
create table public.service_area (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  area extensions.geography(polygon, 4326) not null
);

comment on table public.service_area is
  'The area BanabaConnect serves (Barangay Banaba). Reports outside it are flagged, not rejected.';

alter table public.service_area enable row level security;
-- No policies: only the database functions below read it.

insert into public.service_area (name, area) values (
  'Barangay Banaba, San Mateo, Rizal',
  extensions.st_geogfromtext(
  'SRID=4326;POLYGON((
    121.123914 14.674856, 121.123541 14.675495, 121.120064 14.676885, 121.118828 14.678392, 121.115577 14.677118,
    121.114465 14.678459, 121.112828 14.679208, 121.114015 14.680575, 121.110543 14.681152, 121.108373 14.677084,
    121.106766 14.675521, 121.110578 14.672976, 121.109805 14.670932, 121.110694 14.669853, 121.111889 14.671163,
    121.115348 14.672408, 121.11466 14.673712, 121.116151 14.673949, 121.116872 14.672266, 121.119388 14.67146,
    121.120533 14.670489, 121.120032 14.669176, 121.121823 14.666385, 121.125013 14.666852, 121.124704 14.668568,
    121.125743 14.670101, 121.125712 14.672416, 121.124229 14.672822, 121.123914 14.674856
  ))'
  )
);

-- ---------------------------------------------------------------------------
-- The flag
-- ---------------------------------------------------------------------------

alter table public.reports
  add column outside_banaba_m integer check (outside_banaba_m >= 0);

comment on column public.reports.outside_banaba_m is
  'How far outside Barangay Banaba the report was sent from, in meters. Null when inside, or close enough that GPS error could explain it.';

-- How far outside Banaba a location is, or null if it's inside or within the margin: the
-- report's GPS accuracy, at least 50 m and at most 300 m (outsideMarginMeters in the app).
create function public.meters_outside_banaba(
  p_point extensions.geography,
  p_accuracy real
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when extensions.st_dwithin(
      a.area, p_point, least(300, greatest(50, coalesce(p_accuracy, 0)))::double precision
    ) then null
    else round(extensions.st_distance(a.area, p_point))::integer
  end
  from public.service_area a
  where a.id = 1;
$$;

revoke all on function public.meters_outside_banaba(extensions.geography, real)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Submit a report: same as 20261016000000, plus the flag
-- ---------------------------------------------------------------------------

create or replace function public.submit_report(
  p_id uuid,
  p_category public.report_category,
  p_latitude double precision,
  p_longitude double precision,
  p_location_accuracy real,
  p_description text,
  p_incident_at timestamptz,
  p_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- DRAFT values (see 20261012000000_report_submission.sql).
  cluster_radius_m constant double precision := 150;
  cluster_window constant interval := interval '2 hours';

  v_uid uuid := auth.uid();
  v_existing public.reports;
  v_profile public.profiles;
  v_created_at timestamptz;
  v_incident_at timestamptz;
  v_point extensions.geography;
  v_severity numeric;
  v_credibility numeric;
  v_cluster_id uuid;
  v_priority numeric;
begin
  if v_uid is null then
    raise exception 'Sign in to send a report' using errcode = '42501';
  end if;

  -- The phone retries until it hears back, so the same report can arrive more than once.
  select * into v_existing from public.reports where id = p_id;
  if found then
    if v_existing.reporter_id <> v_uid then
      raise exception 'This report id is already used' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'status', v_existing.status,
      'priority_score', v_existing.priority_score
    );
  end if;

  perform public.ensure_own_profile();

  -- A wrong phone clock shouldn't lose a report, so pull future times back to now.
  v_created_at := least(coalesce(p_created_at, now()), now());
  v_incident_at := least(coalesce(p_incident_at, v_created_at), v_created_at);
  v_point := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude), 4326
  )::extensions.geography;

  -- Severity (S): per category.
  select cs.severity into v_severity
  from public.category_severity cs
  where cs.category = p_category;
  v_severity := coalesce(v_severity, 0.5);

  -- Credibility (C): from the reporter's verification.
  select * into v_profile from public.profiles where id = v_uid;
  v_credibility := case
    when v_profile.is_guest then 0.20
    when v_profile.verification_status = 'verified' then 1.00
    when v_profile.verification_status = 'pending' then 0.60
    else 0.40
  end;

  -- Similar reports nearby in the same time window form one incident (one group).
  -- Reports of one category are grouped one at a time, so two at once can't start two groups.
  perform pg_advisory_xact_lock(hashtext('report_cluster:' || p_category::text));

  select c.id into v_cluster_id
  from public.incident_clusters c
  where c.category = p_category
    and c.last_reported_at >= v_created_at - cluster_window
    and extensions.st_dwithin(c.center, v_point, cluster_radius_m)
  order by extensions.st_distance(c.center, v_point)
  limit 1;

  if v_cluster_id is null then
    insert into public.incident_clusters
      (category, center, report_count, first_reported_at, last_reported_at)
    values (p_category, v_point, 1, v_created_at, v_created_at)
    returning id into v_cluster_id;
  else
    update public.incident_clusters c
    set report_count = c.report_count + 1,
        last_reported_at = greatest(c.last_reported_at, v_created_at)
    where c.id = v_cluster_id;
  end if;

  -- Volume and priority are filled in by rescore_cluster_volume below.
  insert into public.reports (
    id, reporter_id, category, latitude, longitude, location_accuracy_m, description,
    incident_at, created_at,
    severity_score, credibility_score, cluster_id, outside_banaba_m
  ) values (
    p_id, v_uid, p_category, p_latitude, p_longitude, p_location_accuracy,
    coalesce(p_description, ''),
    v_incident_at, v_created_at,
    v_severity, v_credibility, v_cluster_id,
    -- Flagged, never rejected: staff decide what to do with it.
    public.meters_outside_banaba(v_point, p_location_accuracy)
  );

  -- A new person reporting the incident makes every report in the group more urgent;
  -- the same person reporting it again doesn't.
  perform public.rescore_cluster_volume(v_cluster_id);

  insert into public.report_status_history (report_id, to_status, changed_by)
  values (p_id, 'received', v_uid);

  select r.priority_score into v_priority from public.reports r where r.id = p_id;
  return jsonb_build_object('id', p_id, 'status', 'received', 'priority_score', v_priority);
end;
$$;

-- ---------------------------------------------------------------------------
-- Flag the reports already saved
-- ---------------------------------------------------------------------------

update public.reports r
set outside_banaba_m = public.meters_outside_banaba(r.location, r.location_accuracy_m);

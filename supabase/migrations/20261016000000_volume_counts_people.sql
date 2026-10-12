-- Volume (V) counts people, and ignores reports staff marked Invalid.
--
-- Before: every report in a group added to its volume, and never stopped counting. One person
-- sending the same report five times gave full volume, and a fake report kept raising the
-- priority of the real ones even after staff marked it Invalid.
--
-- Now: V = different residents who reported the incident (not counting Invalid reports) / 5,
-- capped at 1. A group is re-scored whenever a report joins it, and whenever staff mark one of
-- its reports Invalid or change it back. Resolved reports still count: the incident was real.
--
-- incident_clusters.report_count still counts every report (the dashboard shows "3 reports");
-- the new reporter_count is the number that drives volume ("2 people reported this").

alter table public.incident_clusters
  add column reporter_count integer not null default 1 check (reporter_count >= 0);

comment on column public.incident_clusters.reporter_count is
  'Different residents with a report in this group that staff haven''t marked Invalid. Drives volume (V).';

-- ---------------------------------------------------------------------------
-- Re-score a group
-- ---------------------------------------------------------------------------

create function public.rescore_cluster_volume(p_cluster_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- DRAFT value (see 20261012000000_report_submission.sql): this many people give full volume.
  full_volume_at constant integer := 5;
  v_people integer;
  v_volume numeric;
begin
  if p_cluster_id is null then
    return;
  end if;

  select count(distinct r.reporter_id) into v_people
  from public.reports r
  where r.cluster_id = p_cluster_id
    and r.status <> 'invalid';

  v_volume := least(v_people, full_volume_at)::numeric / full_volume_at;

  update public.incident_clusters
  set reporter_count = v_people
  where id = p_cluster_id;

  -- P = 0.5·S + 0.3·V + 0.2·C (MCPS_WEIGHTS in packages/shared/src/report.ts).
  update public.reports r
  set volume_score = v_volume,
      priority_score = round(0.5 * r.severity_score + 0.3 * v_volume + 0.2 * r.credibility_score, 3),
      scored_at = now()
  where r.cluster_id = p_cluster_id;
end;
$$;

revoke all on function public.rescore_cluster_volume(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Submit a report: same as before, but volume comes from rescore_cluster_volume
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
    severity_score, credibility_score, cluster_id
  ) values (
    p_id, v_uid, p_category, p_latitude, p_longitude, p_location_accuracy,
    coalesce(p_description, ''),
    v_incident_at, v_created_at,
    v_severity, v_credibility, v_cluster_id
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
-- Update a report's status: same as before, plus re-scoring when Invalid changes
-- ---------------------------------------------------------------------------

create or replace function public.update_report_status(
  p_report_id uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.reports;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_title text;
  v_body text;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only barangay staff can update reports' using errcode = '42501';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if v_report.status = p_status then
    return;
  end if;

  update public.reports
  set status = p_status,
      status_updated_at = now(),
      status_updated_by = v_uid
  where id = p_report_id;

  -- An Invalid report (fake, duplicate, spam) stops raising the priority of the reports around
  -- it, and counts again if staff change their mind.
  if (v_report.status = 'invalid') <> (p_status = 'invalid') then
    perform public.rescore_cluster_volume(v_report.cluster_id);
  end if;

  insert into public.report_status_history (report_id, from_status, to_status, changed_by, note)
  values (p_report_id, v_report.status, p_status, v_uid, v_note);

  -- Plain-language wording for the resident (matches REPORT_STATUS_LABELS in the app).
  v_title := case p_status
    when 'received' then 'Your report was received'
    when 'in_progress' then 'Your report is being handled'
    when 'resolved' then 'Your report was resolved'
    when 'invalid' then 'Your report was closed'
  end;
  v_body := case p_status
    when 'received' then 'The barangay has your report.'
    when 'in_progress' then 'The barangay is responding to your report.'
    when 'resolved' then 'The barangay marked this incident as resolved.'
    when 'invalid' then 'The barangay closed this report.'
  end;
  if v_note is not null then
    v_body := v_body || ' Note from the barangay: ' || v_note;
  end if;

  insert into public.notifications (recipient_id, report_id, title, body)
  values (v_report.reporter_id, p_report_id, v_title, v_body);
end;
$$;

-- ---------------------------------------------------------------------------
-- Guest carry-over: same as before, plus re-scoring the groups it touches. A guest who reported,
-- then signed in and reported again, is one person, not two.
-- ---------------------------------------------------------------------------

create or replace function public.claim_guest_reports(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.guest_claims;
  v_moved integer := 0;
  v_cluster_id uuid;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to an account first' using errcode = '42501';
  end if;

  select * into v_claim
  from public.guest_claims gc
  where gc.token = p_token
    and gc.claimed_at is null
    and gc.expires_at > now()
  for update;

  if not found then
    return 0;
  end if;

  if v_claim.guest_id <> v_uid then
    perform public.ensure_own_profile();

    update public.reports
    set reporter_id = v_uid
    where reporter_id = v_claim.guest_id;
    get diagnostics v_moved = row_count;

    update public.notifications
    set recipient_id = v_uid
    where recipient_id = v_claim.guest_id;

    for v_cluster_id in
      select distinct r.cluster_id
      from public.reports r
      where r.reporter_id = v_uid and r.cluster_id is not null
    loop
      perform public.rescore_cluster_volume(v_cluster_id);
    end loop;
  end if;

  update public.guest_claims
  set claimed_by = v_uid,
      claimed_at = now()
  where token = p_token;

  return v_moved;
end;
$$;

-- ---------------------------------------------------------------------------
-- Re-score every existing group with the new rule
-- ---------------------------------------------------------------------------

do $$
declare
  v_cluster_id uuid;
begin
  for v_cluster_id in select id from public.incident_clusters loop
    perform public.rescore_cluster_volume(v_cluster_id);
  end loop;
end;
$$;

-- Two fixes in how a report is received. Only submit_report changes; no app update is needed.
--
-- Late reports: a report joined any nearby group of its type whose latest report was at most
-- 2 hours older than it, with no limit the other way. A flood report saved on a phone without
-- signal on Monday and sent on Thursday joined Thursday's flood on the same street and counted as
-- one more person reporting it. Now a report joins a group only if it happened within 2 hours of
-- the group's reports, before or after, and an earlier report that joins moves the group's start.
--
-- Repeated sends: on weak signal the phone can send a report again while the first copy is still
-- on its way. Both copies passed the "already received?" check, the second then failed on the
-- duplicate id, and the app showed "retrying" for 30 seconds although the report had arrived. Now
-- the check runs again after waiting for the grouping lock, so the second copy gets the saved
-- report back.

-- Same as 20261019000001_sos_reports.sql, except where marked.
create or replace function public.submit_report(
  p_id uuid,
  p_category public.report_category,
  p_latitude double precision,
  p_longitude double precision,
  p_location_accuracy real,
  p_description text,
  p_incident_at timestamptz,
  p_created_at timestamptz,
  -- SOS only: whether the phone's own lock (fingerprint, face, PIN, password) confirmed it.
  -- Last and optional, so apps from before SOS keep working without sending it.
  p_phone_lock_confirmed boolean default null
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

  -- New: a copy of this report sent at the same moment passed the check above too, and was saved
  -- while this one waited for the lock. Answer with the saved report instead of failing.
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

  -- New: the window applies both ways, so a report sent days late doesn't join a newer incident.
  select c.id into v_cluster_id
  from public.incident_clusters c
  where c.category = p_category
    and c.last_reported_at >= v_created_at - cluster_window
    and c.first_reported_at <= v_created_at + cluster_window
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
        -- New: a report from before the group's first one moves its start back.
        first_reported_at = least(c.first_reported_at, v_created_at),
        last_reported_at = greatest(c.last_reported_at, v_created_at)
    where c.id = v_cluster_id;
  end if;

  -- Volume and priority are filled in by rescore_cluster_volume below.
  insert into public.reports (
    id, reporter_id, category, latitude, longitude, location_accuracy_m, description,
    incident_at, created_at,
    severity_score, credibility_score, cluster_id, outside_banaba_m, phone_lock_confirmed
  ) values (
    p_id, v_uid, p_category, p_latitude, p_longitude, p_location_accuracy,
    coalesce(p_description, ''),
    v_incident_at, v_created_at,
    v_severity, v_credibility, v_cluster_id,
    -- Flagged, never rejected: staff decide what to do with it.
    public.meters_outside_banaba(v_point, p_location_accuracy),
    case when p_category = 'sos' then p_phone_lock_confirmed end
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

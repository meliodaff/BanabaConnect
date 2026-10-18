-- SOS reports (run after 20261019000000_sos_category.sql has committed).
-- An SOS is always Critical (priority 1.000), whoever sends it. The phone's own lock
-- (fingerprint, face, PIN or password) confirms it before sending; phones without a screen lock
-- send after a 3-second hold, and staff see that the phone owner wasn't confirmed.

-- Severity is the highest, for the record; the priority itself is fixed below.
insert into public.category_severity (category, severity) values ('sos', 1.00)
on conflict (category) do update set severity = excluded.severity;

alter table public.reports
  add column if not exists phone_lock_confirmed boolean;

comment on column public.reports.phone_lock_confirmed is
  'SOS only: true when the phone''s lock confirmed the send, false when the phone has no lock. Null for other reports.';

-- ---------------------------------------------------------------------------
-- Priority: SOS is always Critical
-- ---------------------------------------------------------------------------

create or replace function public.rescore_cluster_volume(p_cluster_id uuid)
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

  -- P = 0.5·S + 0.3·V + 0.2·C (MCPS_WEIGHTS in packages/shared/src/report.ts), except SOS,
  -- which is always Critical: the resident had no time to say what is happening.
  update public.reports r
  set volume_score = v_volume,
      priority_score = case when r.category = 'sos' then 1.000 else round(0.5 * r.severity_score + 0.3 * v_volume + 0.2 * r.credibility_score, 3) end,
      scored_at = now()
  where r.cluster_id = p_cluster_id;
end;
$$;

revoke all on function public.rescore_cluster_volume(uuid) from public, anon, authenticated;

-- Verifying a resident re-scores their open reports; an SOS stays at 1.000.
create or replace function public.review_verification(
  p_profile_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_credibility numeric := case when p_approve then 1.00 else 0.40 end;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only barangay staff can verify residents' using errcode = '42501';
  end if;
  if not p_approve and v_note is null then
    raise exception 'Say why the ID was not approved' using errcode = '22023';
  end if;

  update public.profiles
  set verification_status = case when p_approve then 'verified' else 'rejected' end::public.verification_status,
      verified_at = case when p_approve then now() else null end,
      verified_by = v_uid,
      verification_note = v_note
  where id = p_profile_id;
  if not found then
    raise exception 'Resident not found' using errcode = 'P0002';
  end if;

  update public.reports r
  set credibility_score = v_credibility,
      priority_score = case when r.category = 'sos' then 1.000 else round(0.5 * r.severity_score + 0.3 * r.volume_score + 0.2 * v_credibility, 3) end,
      scored_at = now()
  where r.reporter_id = p_profile_id
    and r.status in ('received', 'dispatched', 'in_progress');

  insert into public.notifications (recipient_id, title, body)
  values (
    p_profile_id,
    case when p_approve then 'You are now a verified resident' else 'Your Barangay ID wasn''t approved' end,
    case
      when p_approve then 'Your reports are now marked as from a verified resident.'
      else 'Note from the barangay: ' || v_note || ' You can send a new photo from the Profile tab.'
    end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Submit a report: same as 20261017000000_outside_banaba_flag.sql, plus the phone-lock answer
-- ---------------------------------------------------------------------------

-- Replaced, not overloaded, so a call without p_phone_lock_confirmed has exactly one match.
drop function if exists public.submit_report(uuid, public.report_category, double precision, double precision, real, text, timestamptz, timestamptz);

create function public.submit_report(
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

revoke all on function public.submit_report(uuid, public.report_category, double precision, double precision, real, text, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.submit_report(uuid, public.report_category, double precision, double precision, real, text, timestamptz, timestamptz, boolean) to authenticated;

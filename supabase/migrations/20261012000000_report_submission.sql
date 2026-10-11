-- Report submission, photo attachment and guest carry-over.
--
-- The app calls these functions with supabase.rpc(). They run as the database owner
-- (security definer), so residents still can't insert or edit reports directly and can't set
-- their own scores: the reporter comes from auth.uid() and the MCPS scores are computed here.
-- Guests use Supabase anonymous sign-in, so they call these as `authenticated` too.
-- This replaces the planned POST /api/reports; the dashboard can reuse the same functions.
--
-- DRAFT values, like category_severity: the credibility per verification status, the
-- clustering radius and time window, and the report count that gives full volume are still
-- open questions in the PRD. Replace them once the expert panel defines them.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Accounts made before the initial schema have no profile row; reports need one.
create function public.ensure_own_profile()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profiles (id, is_guest)
  values (auth.uid(), coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  on conflict (id) do nothing;
$$;

revoke all on function public.ensure_own_profile() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Submit a report
-- ---------------------------------------------------------------------------

create function public.submit_report(
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
  -- DRAFT values (see the top of this file).
  cluster_radius_m constant double precision := 150;
  cluster_window constant interval := interval '2 hours';
  full_volume_at constant integer := 5;

  v_uid uuid := auth.uid();
  v_existing public.reports;
  v_profile public.profiles;
  v_created_at timestamptz;
  v_incident_at timestamptz;
  v_point extensions.geography;
  v_severity numeric;
  v_credibility numeric;
  v_cluster_id uuid;
  v_count integer;
  v_volume numeric;
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

  -- Volume (V): similar reports nearby in the same time window form one incident.
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
    returning id, report_count into v_cluster_id, v_count;
  else
    update public.incident_clusters c
    set report_count = c.report_count + 1,
        last_reported_at = greatest(c.last_reported_at, v_created_at)
    where c.id = v_cluster_id
    returning c.report_count into v_count;
  end if;

  v_volume := least(v_count, full_volume_at)::numeric / full_volume_at;

  -- P = 0.5·S + 0.3·V + 0.2·C (MCPS_WEIGHTS in packages/shared/src/report.ts).
  v_priority := round(0.5 * v_severity + 0.3 * v_volume + 0.2 * v_credibility, 3);

  insert into public.reports (
    id, reporter_id, category, latitude, longitude, location_accuracy_m, description,
    incident_at, created_at,
    severity_score, volume_score, credibility_score, priority_score, scored_at, cluster_id
  ) values (
    p_id, v_uid, p_category, p_latitude, p_longitude, p_location_accuracy,
    coalesce(p_description, ''),
    v_incident_at, v_created_at,
    v_severity, v_volume, v_credibility, v_priority, now(), v_cluster_id
  );

  -- More reports about the same incident make every report in the group more urgent.
  update public.reports r
  set volume_score = v_volume,
      priority_score = round(0.5 * r.severity_score + 0.3 * v_volume + 0.2 * r.credibility_score, 3),
      scored_at = now()
  where r.cluster_id = v_cluster_id
    and r.id <> p_id;

  insert into public.report_status_history (report_id, to_status, changed_by)
  values (p_id, 'received', v_uid);

  return jsonb_build_object('id', p_id, 'status', 'received', 'priority_score', v_priority);
end;
$$;

revoke all on function public.submit_report(
  uuid, public.report_category, double precision, double precision, real, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.submit_report(
  uuid, public.report_category, double precision, double precision, real, text, timestamptz, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- Report photos: uploaded after the report, at <user id>/<report id>.jpg
-- ---------------------------------------------------------------------------

create policy "Reporters upload their report photo" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'report-photos'
    and exists (
      select 1
      from public.reports r
      where r.reporter_id = auth.uid()
        and r.photo_path is null
        and name = auth.uid()::text || '/' || r.id::text || '.jpg'
    )
  );

create function public.attach_report_photo(p_report_id uuid, p_width integer, p_height integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_path text;
begin
  if v_uid is null then
    raise exception 'Sign in to add a photo' using errcode = '42501';
  end if;

  -- The app calls this only after the upload succeeded. The path is always the caller's own
  -- folder, which the storage policy above only lets them write for their own report.
  v_path := v_uid::text || '/' || p_report_id::text || '.jpg';

  update public.reports
  set photo_path = v_path,
      photo_width = nullif(p_width, 0),
      photo_height = nullif(p_height, 0),
      photo_uploaded_at = now()
  where id = p_report_id
    and reporter_id = v_uid;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.attach_report_photo(uuid, integer, integer) from public, anon;
grant execute on function public.attach_report_photo(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Guest carry-over: a guest who registers on the same phone keeps their reports
-- ---------------------------------------------------------------------------

-- Only reachable through the functions below (RLS on, no policies).
create table public.guest_claims (
  token uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz
);

alter table public.guest_claims enable row level security;

-- Called by the guest's session just before signing in or registering.
create function public.create_guest_claim()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null or not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Only a guest session can hand over its reports' using errcode = '42501';
  end if;

  perform public.ensure_own_profile();

  insert into public.guest_claims (guest_id)
  values (auth.uid())
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_guest_claim() from public, anon;
grant execute on function public.create_guest_claim() to authenticated;

-- Called by the new account. Returns how many reports moved; 0 for an unknown,
-- expired or already used token.
create function public.claim_guest_reports(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.guest_claims;
  v_moved integer := 0;
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
  end if;

  update public.guest_claims
  set claimed_by = v_uid,
      claimed_at = now()
  where token = p_token;

  return v_moved;
end;
$$;

revoke all on function public.claim_guest_reports(uuid) from public, anon;
grant execute on function public.claim_guest_reports(uuid) to authenticated;

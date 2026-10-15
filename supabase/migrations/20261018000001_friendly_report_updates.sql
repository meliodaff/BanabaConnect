-- Resident-facing wording matches REPORT_STATUS_LABELS / REPORT_STATUS_DETAILS.
-- Run after 20261018000000_response_dispatch_status.sql has committed.
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

  if p_status is null then
    raise exception 'Choose a status' using errcode = '22023';
  end if;
  if p_status = 'invalid' and v_note is null then
    raise exception 'Write why the report is invalid. The resident will see this.' using errcode = '22023';
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

  if (v_report.status = 'invalid') <> (p_status = 'invalid') then
    perform public.rescore_cluster_volume(v_report.cluster_id);
  end if;

  insert into public.report_status_history (report_id, from_status, to_status, changed_by, note)
  values (p_report_id, v_report.status, p_status, v_uid, v_note);

  v_title := case p_status
    when 'received' then 'Natanggap na ng barangay'
    when 'dispatched' then 'Papunta na ang responders'
    when 'in_progress' then 'Inaasikaso na ang report'
    when 'resolved' then 'Naayos na ang report'
    when 'invalid' then 'Isinara ang report'
  end;
  v_body := case p_status
    when 'received' then 'Natanggap na ng barangay ang report mo. Susuriin ito ng barangay staff.'
    when 'dispatched' then 'Papunta na ang responders sa iniulat na lokasyon. Manatili sa ligtas na lugar.'
    when 'in_progress' then 'Inaasikaso na ng barangay ang report mo.'
    when 'resolved' then 'Minarkahan na ng barangay na naayos ang iniulat na insidente.'
    when 'invalid' then 'Isinara ng barangay ang report mo. Basahin ang mensahe ng barangay para sa dahilan.'
  end;
  if v_note is not null then
    v_body := v_body || ' Mensahe mula sa barangay: ' || v_note;
  end if;

  insert into public.notifications (recipient_id, report_id, title, body)
  values (v_report.reporter_id, p_report_id, v_title, v_body);
end;
$$;

revoke all on function public.update_report_status(uuid, public.report_status, text) from public, anon;
grant execute on function public.update_report_status(uuid, public.report_status, text) to authenticated;

-- A dispatched report is still open, so verification changes also update its credibility.
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
      priority_score = round(0.5 * r.severity_score + 0.3 * r.volume_score + 0.2 * v_credibility, 3),
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

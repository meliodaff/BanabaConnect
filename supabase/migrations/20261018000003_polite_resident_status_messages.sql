-- Final resident-approved messages, also used by REPORT_STATUS_DETAILS in the app.
-- Can run after 20261018000001, whether or not 20261018000002 was already applied.
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
    when 'received' then 'Natanggap na po ng barangay ang report mo. Susuriin ito ng barangay staff.'
    when 'dispatched' then 'Papunta na po ang responders sa iniulat na lokasyon. Manatili sa ligtas na lugar.'
    when 'in_progress' then 'Nasa lokasyon na po ang mga tauhan ng barangay at inaasikaso na nila ang sitwasyon.'
    when 'resolved' then 'Minarkahan na po ng barangay na naayos na ang iniulat na insidente.'
    when 'invalid' then 'Isinara na po ng barangay ang report mo. Basahin ang mensahe ng barangay para sa dahilan.'
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

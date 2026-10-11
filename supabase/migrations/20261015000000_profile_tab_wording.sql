-- The app's "Me" tab is now called "Profile". This updates the wording of the notification a
-- resident gets when their Barangay ID isn't approved. The logic is unchanged.

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
  -- DRAFT credibility values, the same as submit_report.
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

  -- Credibility (C) follows verification, so the resident's open reports move in the queue now.
  -- Resolved and closed reports keep the score they were handled with.
  update public.reports r
  set credibility_score = v_credibility,
      priority_score = round(0.5 * r.severity_score + 0.3 * r.volume_score + 0.2 * v_credibility, 3),
      scored_at = now()
  where r.reporter_id = p_profile_id
    and r.status in ('received', 'in_progress');

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

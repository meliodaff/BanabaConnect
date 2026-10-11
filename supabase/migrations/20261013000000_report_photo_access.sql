-- Let residents read the photos of every report they own.
--
-- Photos are stored at <uploader's user id>/<report id>.jpg. When a guest registers, their
-- reports move to the new account (claim_guest_reports), but the photos stay in the guest's
-- folder. The old rule only allowed reading your own folder, so those photos couldn't be
-- downloaded again after signing back in. Ownership now comes from the report itself.

drop policy "Owners and admins read report photos" on storage.objects;

create policy "Reporters and admins read report photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'report-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.reports r
        where r.photo_path = name
          and r.reporter_id = auth.uid()
      )
    )
  );

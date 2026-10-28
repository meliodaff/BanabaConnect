-- Faster privacy checks. Who can see what does not change.
--
-- Each of these rules asked "who is signed in?" and "is this person staff?" once for every row the
-- database looked at. For the dashboard that meant every stored report, not only the open ones:
-- with about 100,000 reports each list or count took over a second, the Reports page (8 queries
-- at once) took 6 seconds, and with 3 or more staff using it at once it failed to load.
--
-- Written as (select ...), each answer is worked out once per query and reused, as Supabase's
-- row-level security performance guide recommends. The answers can't differ between rows: they
-- depend only on who is signed in. Measured on 101,000 reports, the list of open reports went
-- from 1.27 seconds to 0.025 seconds.
--
-- alter policy changes only the condition; each rule keeps its name, roles and command.

alter policy "Residents read their own reports" on public.reports
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

alter policy "Users read their own profile" on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()));

alter policy "Admins read clusters" on public.incident_clusters
  using ((select public.is_admin()));

alter policy "Read history of visible reports" on public.report_status_history
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.reports r
      where r.id = report_id and r.reporter_id = (select auth.uid())
    )
  );

alter policy "Users read their own notifications" on public.notifications
  using (recipient_id = (select auth.uid()));

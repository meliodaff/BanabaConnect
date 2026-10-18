-- One-tap SOS from the home-screen widget, the app icon shortcut, or the Home tab button,
-- for emergencies where the resident has no time to say what is happening.
-- Its own migration: a new enum value must be committed before
-- 20261019000001_sos_reports.sql can use it.
alter type public.report_category add value if not exists 'sos' before 'flood';

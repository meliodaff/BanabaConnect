-- Commit the enum change before the next migration uses this status.
-- Existing In progress reports keep their meaning; dispatch must be confirmed by staff.
alter type public.report_status add value if not exists 'dispatched' before 'in_progress';

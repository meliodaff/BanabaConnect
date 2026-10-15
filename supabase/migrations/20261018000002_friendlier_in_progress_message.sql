-- Change only the notification wording; keep the existing status action and its permissions.
-- The previous two migrations may already be applied, so this is a new migration.
do $migration$
declare
  v_previous text := 'Inaasikaso na ng barangay ang report mo.';
  v_message text := 'Tinutulungan ka na ng barangay. Ginagawa namin ang makakaya para maayos ang iniulat mong insidente.';
  v_definition text := pg_get_functiondef(
    'public.update_report_status(uuid, public.report_status, text)'::regprocedure
  );
begin
  if position(quote_literal(v_message) in v_definition) > 0 then
    return;
  end if;
  if position(quote_literal(v_previous) in v_definition) = 0 then
    raise exception 'Expected status message not found. Apply 20261018000001_friendly_report_updates.sql first.';
  end if;
  execute replace(v_definition, quote_literal(v_previous), quote_literal(v_message));
end;
$migration$;

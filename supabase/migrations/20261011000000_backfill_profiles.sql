-- Accounts created before the initial schema existed have no profile row, because the
-- on_auth_user_created trigger wasn't there yet. Without a row, saving resident details
-- updates nothing. Safe to run more than once.
insert into public.profiles (id, is_guest, full_name)
select
  u.id,
  coalesce(u.is_anonymous, false),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
on conflict (id) do nothing;

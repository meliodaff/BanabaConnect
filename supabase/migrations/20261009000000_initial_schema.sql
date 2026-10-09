-- BanabaConnect initial schema (Supabase / Postgres).
--
-- Based on the Initial PRD (Chapter I):
--   * Residents register a profile (verified by a barangay admin) or report as a guest.
--   * Reports carry category, GPS location, photo, description, and incident time.
--   * The Next.js API receives synced reports, computes the MCPS priority score
--     P = 0.5*S + 0.3*V + 0.2*C, groups similar reports by distance and time (volume),
--     and sends status notifications.
--   * Residents see only their own reports; admins manage all reports.
--
-- The mobile app never writes tables directly. It posts to the Next.js API, which uses
-- the service role (bypasses RLS). RLS below covers what the app and dashboard read
-- with a user session, and what admins change from the dashboard.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (values match packages/shared/src/report.ts)
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('resident', 'admin');

create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create type public.report_category as enum (
  'flood',
  'fire',
  'medical',
  'accident',
  'crime',
  'road_blockage',
  'power_line',
  'other'
);

create type public.report_status as enum ('received', 'in_progress', 'resolved', 'invalid');

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user (residents, guests, admins)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'resident',
  -- Guests sign in with Supabase anonymous auth, so their reports still have an owner.
  is_guest boolean not null default false,
  full_name text,
  phone text,
  -- Sitio or purok, e.g. North Libis, South Libis, Dama de Noche.
  area text,
  address text,
  verification_status public.verification_status not null default 'unverified',
  -- Storage path (verification-documents bucket) of the ID or proof of residency.
  verification_document_path text,
  verification_note text,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.verification_status is
  'Credibility (C) in MCPS comes from this, approved by a barangay admin (PRD delimitation 10).';

-- ---------------------------------------------------------------------------
-- MCPS inputs
-- ---------------------------------------------------------------------------

-- Severity (S) per category, 0 to 1.
create table public.category_severity (
  category public.report_category primary key,
  severity numeric(3, 2) not null check (severity between 0 and 1),
  updated_at timestamptz not null default now()
);

-- DRAFT values: the per-category severities are still an open question in the PRD.
-- Replace them once the expert panel defines them.
insert into public.category_severity (category, severity) values
  ('medical', 1.00),
  ('fire', 1.00),
  ('flood', 0.80),
  ('power_line', 0.80),
  ('accident', 0.70),
  ('crime', 0.60),
  ('road_blockage', 0.40),
  ('other', 0.30);

-- Similar reports grouped by the API within a distance and time window.
-- The group's size gives report volume (V); the dashboard shows them as linked reports.
create table public.incident_clusters (
  id uuid primary key default gen_random_uuid(),
  category public.report_category not null,
  center extensions.geography(point, 4326) not null,
  report_count integer not null default 1 check (report_count > 0),
  first_reported_at timestamptz not null,
  last_reported_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incident_clusters_center_idx on public.incident_clusters using gist (center);
create index incident_clusters_recent_idx on public.incident_clusters (category, last_reported_at desc);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table public.reports (
  -- Generated on the phone. Re-sending the same report hits this key, so offline
  -- retries never create duplicates (PRD objective 2).
  id uuid primary key,
  reporter_id uuid not null references public.profiles (id),
  category public.report_category not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  location_accuracy_m real check (location_accuracy_m >= 0),
  description text not null default '' check (char_length(description) <= 500),
  incident_at timestamptz not null,
  -- When the report was saved on the phone, and when the server accepted it.
  -- The gap is how long it waited for signal.
  created_at timestamptz not null,
  received_at timestamptz not null default now(),

  -- Photo, uploaded after the report (it may arrive later on weak signal).
  photo_path text,
  photo_width integer check (photo_width > 0),
  photo_height integer check (photo_height > 0),
  photo_uploaded_at timestamptz,

  -- MCPS breakdown shown on the dashboard. Each part is 0 to 1.
  severity_score numeric(4, 3) check (severity_score between 0 and 1),
  volume_score numeric(4, 3) check (volume_score between 0 and 1),
  credibility_score numeric(4, 3) check (credibility_score between 0 and 1),
  priority_score numeric(4, 3) check (priority_score between 0 and 1),
  scored_at timestamptz,
  cluster_id uuid references public.incident_clusters (id) on delete set null,

  status public.report_status not null default 'received',
  status_updated_at timestamptz not null default now(),
  status_updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_queue_idx on public.reports (status, priority_score desc nulls last);
create index reports_cluster_idx on public.reports (cluster_id);
create index reports_location_idx on public.reports using gist (location);

-- Every status change, for the resident's status tracker and the audit trail.
create table public.report_status_history (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  from_status public.report_status,
  to_status public.report_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  changed_at timestamptz not null default now()
);

create index report_status_history_report_idx on public.report_status_history (report_id, changed_at);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
create trigger incident_clusters_updated_at before update on public.incident_clusters
  for each row execute function public.set_updated_at();
create trigger category_severity_updated_at before update on public.category_severity
  for each row execute function public.set_updated_at();

-- Create a profile for every new auth user, including anonymous (guest) sign-ins.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, is_guest, full_name)
  values (
    new.id,
    coalesce(new.is_anonymous, false),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Residents may edit their own details but not their role or verification result.
create function public.guard_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
      or new.is_guest is distinct from old.is_guest
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.verification_note is distinct from old.verification_note
      or (new.verification_status is distinct from old.verification_status
          and not (old.verification_status in ('unverified', 'rejected')
                   and new.verification_status = 'pending'))
    then
      raise exception 'Only a barangay admin can change role or verification';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_fields before update on public.profiles
  for each row execute function public.guard_profile_fields();

alter table public.profiles enable row level security;
alter table public.category_severity enable row level security;
alter table public.incident_clusters enable row level security;
alter table public.reports enable row level security;
alter table public.report_status_history enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update any profile" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- category_severity
create policy "Signed-in users read severities" on public.category_severity
  for select to authenticated using (true);
create policy "Admins change severities" on public.category_severity
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- incident_clusters
create policy "Admins read clusters" on public.incident_clusters
  for select to authenticated using (public.is_admin());

-- reports: inserted by the API only; residents cannot edit a submitted report.
create policy "Residents read their own reports" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "Admins update reports" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- report_status_history
create policy "Read history of visible reports" on public.report_status_history
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.reports r
      where r.id = report_id and r.reporter_id = auth.uid()
    )
  );
create policy "Admins add history" on public.report_status_history
  for insert to authenticated with check (public.is_admin() and changed_by = auth.uid());

-- push_tokens
create policy "Users manage their own push tokens" on public.push_tokens
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- notifications
create policy "Users read their own notifications" on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "Users mark their own notifications read" on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- Object paths start with the owner's user id: <user id>/<report id>.jpg

insert into storage.buckets (id, name, public) values
  ('report-photos', 'report-photos', false),
  ('verification-documents', 'verification-documents', false);

create policy "Owners and admins read report photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'report-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "Residents upload verification documents" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners and admins read verification documents" on storage.objects
  for select to authenticated using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- Realtime: the dashboard's live queue and the resident's status tracker
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.notifications;

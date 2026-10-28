# Command Dashboard setup

The Command Dashboard (`apps/web`) is a Next.js app for barangay staff. It uses the same Supabase
project as the mobile app and runs on Vercel's free plan.

## 1. Database

In Supabase → **SQL Editor**, run `supabase/migrations/20261014000000_dashboard.sql`. It adds:

- `update_report_status`: changes a report's status, records it in the status history, and
  notifies the resident.
- `review_verification`: approves or rejects a resident's Barangay ID and re-scores their open
  reports.

Only admins can call either one.

### Friendly resident updates

Apply the existing migrations through `20261017000000_outside_banaba_flag.sql` first.
Then run these two files in order, as separate SQL Editor runs (or separate migration
transactions), before deploying the updated dashboard:

1. `supabase/migrations/20261018000000_response_dispatch_status.sql`
2. `supabase/migrations/20261018000001_friendly_report_updates.sql`

The first adds `dispatched` to the status enum and must commit before the second uses it.
The second updates the staff action, notification wording, and scoring of open reports.
Dispatch is a separate staff choice.

For the final polite resident messages, run
`supabase/migrations/20261018000003_polite_resident_status_messages.sql`. If the first two
migrations are already applied, run only this new file. (An earlier wording-only migration,
`20261018000002`, was removed because this file replaces it; a database that already ran it
needs nothing extra.)

The resident message for In progress now says barangay personnel are at the location.
Reports that were already In progress before this change were not necessarily on site, but
residents will now read that message for them too. While only the team is testing, those are
test reports. Before the public release, check that no real report is left In progress from
before this change, or move it to the right status.
Reload the updated app/dashboard to see the messages in resident report details and the
employee preview. Use In progress only once barangay personnel are at the location and
handling the incident, because that is what its resident message now says.

In **Reports → open a report → Update status**, staff choose **Responders on the way**
(**Papunta na ang responders** in Filipino) only after responders have been sent. The
preview below the choices shows the same Filipino message residents see in **My Reports**
and the report details. Optional staff notes still appear below the resident's status.
Received reports say **Natanggap na ng barangay**; active handling, resolution, and closure
also have friendly Filipino messages. Dispatched reports stay in active queues and monthly totals.

The status action writes a matching row to the existing `notifications` table. Delivery as
a phone push notification still depends on the separate push-notification setup.

Update the resident app before staff start choosing the new status. Versions up to 1.0.7
do not recognize `dispatched` and keep showing the previous status. Newer versions show a
status they don't know as "May update ang barangay" and ask the resident to update the app. Test with `npm run test:status` and mobile lint/typecheck.

### One-tap SOS

Run these as separate SQL Editor runs, in order, **before** deploying the dashboard (it reads
the new `phone_lock_confirmed` column):

1. `supabase/migrations/20261019000000_sos_category.sql`
2. `supabase/migrations/20261019000001_sos_reports.sql`

An SOS is always Critical. See `docs/sos.md` for how residents send one and what staff see.

### Late and repeated reports

Run `supabase/migrations/20261028000000_late_and_repeated_reports.sql` in the SQL Editor. It
only replaces the `submit_report` function, so it can run at any time and needs no app update:

- A report that waited on a phone without signal joins an incident only if it happened within
  2 hours of that incident's reports. Before, a report sent days late could join a newer incident
  on the same street and make it look like more people reported it.
- When a phone sends the same report twice at the same moment, both copies get the saved report
  back. Before, the second copy failed and the app showed "retrying" for 30 seconds even though
  the report had arrived.

### Faster dashboard with many reports

Run `supabase/migrations/20261028000001_faster_privacy_checks.sql` in the SQL Editor. It changes
how five privacy rules run, not what they allow: each rule now checks who is signed in once per
query instead of once per stored report. Without it the dashboard slows down as reports pile up;
with about 100,000 reports the Reports page took 6 seconds and failed to load when 3 or more staff
used it at once. No app or dashboard update is needed.

## 2. The admin account

There is one staff account for now.

1. Go to Supabase → **Authentication → Users → Add user → Create new user**. Enter the staff
   member's email and a strong password, and tick **Auto Confirm User**.
2. In the **SQL Editor**, make that account an admin, using the same email:

   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Barangay Banaba Staff'
   where id = (select id from auth.users where email = 'staff@example.com');
   ```

A resident account that signs in to the dashboard sees "This account isn't barangay staff" and
can't see any data.

## 3. Run it on your computer

```bash
cp apps/web/.env.example apps/web/.env.local   # then fill in the same values as the mobile app
npm install
npm run web                                    # http://localhost:3000
```

## 4. Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Set **Root Directory** to `apps/web`. The framework is detected as Next.js.
3. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with the same values as `.env.local`.
4. Click **Deploy**. Every push to `main` deploys again automatically.

The dashboard only uses the public (publishable) key. Staff access comes from the admin role and
the database's row-level security, so no secret key is stored on Vercel.

## What staff can do

- **Overview:** urgent reports nobody has started on (and how long the oldest has waited),
  reports being handled, Barangay IDs to review, and today's reports. Below that, the most urgent
  reports, incidents reported by several people, and active reports by type.
- **Reports:** every report ranked by priority, highest first. New reports appear and flash
  without refreshing the page.
- **Map:** a vector map (OpenFreeMap, free, no API key) framed on Barangay Banaba, San Mateo,
  with its official boundary outlined in blue and reports as pins colored by priority. Click a pin
  to open the report; **Show all reports** zooms out to reports outside the barangay. Computers
  without WebGL see a message instead, and the reports stay listed under Reports.
- **Report details:** the photo, location, linked reports about the same incident, how the
  priority was calculated, the reporter, the timeline, and the status update.
- **Residents:** Barangay IDs waiting for review. Approve, or reject with a reason the resident
  sees in the app.

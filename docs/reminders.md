# Reminders

Decisions already made, and work to come back to. For what must be done before releasing to
residents, see [release-checklist.md](release-checklist.md).

## Reject reports from outside Barangay Banaba

**Decided:** reports from outside Banaba are not accepted at all.
**Why not built yet:** the team tests from outside Banaba, so it couldn't be tested.

When building it:

- **Boundary (found).** The official outline (PSA 2023, PSGC 0405811012) is already in
  `apps/web/lib/banabaBoundary.ts`, with an `isInsideBanaba()` check that the dashboard map uses.
  For rejecting reports, store the same polygon in a database table so `submit_report` can check
  it with PostGIS, and it can be corrected without an app update.
- **Server.** `submit_report` (`supabase/migrations/20261012000000_report_submission.sql`)
  refuses a report whose location is outside the boundary, with its own error code.
- **Allow for GPS error.** Accept a report if it's within its GPS accuracy of the border, plus
  a small margin, so residents near the edge aren't wrongly blocked during an emergency.
- **App, before sending.** If the phone's location is clearly outside, the report screen says so
  right away. For example: "BanabaConnect only takes reports inside Barangay Banaba. For an
  emergency here, call 911." The resident shouldn't find out after waiting.
- **Queue.** A report the server rejects as outside must not retry forever (the sync engine
  retries every error). Show it as "Not accepted: outside Banaba" instead of "Not sent yet".
- **Testing from outside Banaba.** Keep an on/off switch for the check in the database (off
  during development), or add a test area around the developer's location.

## Test the Barangay ID upload end to end

The database checks covered report photos but not Barangay IDs.

1. Upload an ID on the Profile tab. It should appear in **Storage → verification-documents**, and the
   badge should show **Under review**.
2. Approve it in the SQL Editor:

   ```sql
   update public.profiles
   set verification_status = 'verified', verified_at = now()
   where id = (select id from auth.users where email = 'resident@example.com');
   ```

3. Reopen the app. The badge should show **Verified resident**.
4. Also try `verification_status = 'rejected'` with a `verification_note`. The resident should
   see the note and be able to send a new photo.

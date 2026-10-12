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

## Improve the priority formula (MCPS)

**Decided:** not yet. Keep these in mind and bring them to the expert panel (see the MCPS item in
[release-checklist.md](release-checklist.md)). Already done on 2026-10-12: volume counts
different people and leaves out reports marked Invalid
(`supabase/migrations/20261016000000_volume_counts_people.sql`).

Today: Priority = 0.5 × seriousness + 0.3 × people reporting (÷ 5, capped) + 0.2 × reporter trust.
With the draft values, a single report adds 0.06 for volume.

| Report | Priority | Band |
|---|---|---|
| Fire, verified resident | 0.76 | Critical |
| Fire or medical emergency, guest | 0.60 | High |
| Fire, 3 different guests | 0.72 | High |
| "Other", 5 verified residents | 0.65 | High |
| Road blocked, guest | 0.30 | Low |

Weak spots, most important first:

1. **A guest's fire or medical report can never be Critical on its own** (0.60 at most), and
   most people in an emergency won't have a verified ID. Idea: life-threatening categories
   never drop below a minimum (e.g. 0.70), or reporter trust counts less for them.
2. **Seriousness only looks at the category**, so a trash fire and a burning house score the
   same. Idea: one yes/no question in the app, "Is anyone hurt or trapped?", where "Yes" sets
   seriousness to the maximum.
3. **Waiting time isn't counted**, so a Medium report can wait indefinitely behind new High ones
   on a busy night. Idea: a small boost the longer it waits, or sort equal priorities oldest
   first.
4. **Odd rankings**, e.g. five verified residents reporting "Other" (0.65) outrank one guest's
   fire (0.60). Fixing #1 mostly solves this.

Guests faking "many people" by clearing the app's data is a release blocker; see "Stop one
guest from faking 'many people' on a report" in [release-checklist.md](release-checklist.md).

**How to check the values:** have a few barangay staff rank 10 sample reports by hand and
compare with the formula's ranking; adjust where they disagree. That gives the expert panel
real evidence.

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

# Reminders

Decisions already made, and work to come back to. For what must be done before releasing to
residents, see [release-checklist.md](release-checklist.md).

## Reports from outside Barangay Banaba: flagged, not rejected

**Decided 2026-10-12 (replaces the earlier "reject them" decision):** reports from outside
Banaba are accepted and flagged "Outside Banaba" for staff to decide. Rejecting was riskier:
GPS can be off by tens of meters near the border, an incident just outside can still affect
Banaba, and a report that waited for signal shouldn't be turned away hours later.

**Built** (`supabase/migrations/20261017000000_outside_banaba_flag.sql`):

- **Boundary in the database.** The official PSA 2023 outline is in `public.service_area`; the
  app and dashboard use the same polygon from `packages/shared/src/banabaBoundary.ts`. Change both
  together.
- **Flag on arrival.** `submit_report` saves `reports.outside_banaba_m`: meters outside, or null
  when inside or within the GPS margin (the report's accuracy, at least 50 m, at most 300 m).
- **Dashboard.** An "Outside Banaba" tag in the Reports list, on Overview and on the report page
  (with the distance and what to do), and in map pin cards. With equal priority, reports from
  inside Banaba come first.
- **App.** Before sending from clearly outside: "You seem to be outside Barangay Banaba", with
  Call 911 and "Send to Banaba anyway".

**Maybe later:** reject only reports far away (e.g. outside San Mateo), which can't be a Banaba
emergency and GPS error can't explain.

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

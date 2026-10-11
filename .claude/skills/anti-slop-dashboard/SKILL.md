---
name: anti-slop-dashboard
description: Audit or improve the BanabaConnect Command Dashboard (apps/web) so it looks professional, civic and calm, and is easy for barangay staff to navigate while triaging emergencies, by removing "AI slop" like decorative stat cards, fake metrics, vague labels, color misuse, hidden actions, missing feedback, and filler copy. Use when designing, reviewing, or changing any page, component, style, or staff-facing text in apps/web, or when the user says the dashboard looks generic, cluttered, unprofessional, confusing, or "AI-made".
---

# Anti-slop UI for the Command Dashboard

Slop in a dashboard is anything that costs a staff member time or trust during an emergency:
a stat card that looks important but means nothing, a red color on something that isn't
urgent, a status that changes with no confirmation, a label only the developer understands, a
list that jumps while someone is reading it. This skill names those patterns and what to do
instead, inside the look the dashboard already has. For the resident mobile app, use the
`anti-slop-ui` skill instead.

## Who the dashboard is for

Decide every page against these people:

- Barangay Banaba staff: the secretary, the BDRRM focal person, a kagawad, or a tanod at the
  desk. Comfortable with Facebook and a browser, **not** with admin software.
- At the barangay hall on a shared Windows laptop or desktop, often a **1366×768** screen,
  Chrome or Edge, sometimes projected for others to see. Sometimes a tablet.
- Long shifts during typhoons and floods, when dozens of reports arrive at once and a wrong
  call delays help.
- Their job on every visit: **see what is most urgent, open it, act, and mark what was done.**
  The second job is checking residents' Barangay IDs.

Professional here means **civic, calm and trustworthy**, like a well-made government service,
not a startup analytics product.

## House style: keep it

The dashboard uses an eGovPH-inspired look. Keep it, and improve usability inside it:

- A **white sidebar** with a thin gray border and a thin sun-yellow top stripe. At the top, the
  **Barangay Banaba seal** (`public/brand/barangay-banaba-seal.jpg`, shown in a circle) with
  "Barangay Banaba / San Mateo, Rizal", and below them, on its own full-width line (never
  truncated), "Banaba**Connect**" with "Command Dashboard" in a soft blue box. Links are grouped
  under small headings (**Monitoring**: Overview, Reports, Map; **Residents**: Residents), each
  with a simple line icon from `components/NavIcons.tsx`. The current link has a soft blue
  highlight and a blue bar on its left. At the bottom: the staff member's initials, name, role,
  and Sign out. The user rejected a bright blue sidebar as too loud; don't bring back large
  blue surfaces.
- White page headers with a bold title, a one-line description, and filter tabs on the right.
- White cards with thin gray borders on a light gray page; rounded corners; little or no shadow.
- The **priority badge**: a square with the score out of 100, filled with its band color,
  followed by the band name (Critical / High / Medium / Low).
- Status pills, verification badges, and the yellow highlight plus "NEW" tag for incoming
  reports.

Propose larger visual changes to the user before making them.

## Two modes

**Audit.** List each problem below that appears, with `file:line`, the element or string, and
the fix in a few words. Don't change code. Rank by harm to triage: anything that could make
staff miss or misjudge an urgent report comes first.

**Apply.** Fix the problems with the smallest change that keeps the house style. Say what
changed and why.

## Generic "AI dashboard" patterns to remove

These make a dashboard look machine-made and waste the first screen:

- **Decorative stat cards.** "Total Reports: 128 ↑12%" tiles with trends nobody asked for.
  Show a number only if staff act on it (e.g. "3 Barangay IDs waiting" in the sidebar). The
  Overview's tiles (`StatTile`) each link to where staff act on that number; keep it that way.
- **Fake or meaningless metrics.** Sparklines, donuts, "engagement", "response rate" or
  "efficiency score" that the database doesn't actually compute. Never invent data or
  placeholder numbers.
- **Greeting banners and filler headers.** "Welcome back, Admin 👋", "Here's what's happening
  today". The page title and the queue are the greeting.
- **Ornament over information.** Gradients, glassmorphism, glowing borders, blobs, emoji, big
  hero illustrations, icons on every label, heavy drop shadows. Use flat surfaces, borders and
  whitespace.
- **Card soup.** Everything boxed in equal cards with no hierarchy. The queue is a list or table
  that reads top to bottom; the most urgent thing is the biggest and first.
- **Lookalike buttons.** Five same-styled buttons in a row. Each area has **one** primary action
  (filled blue); others are outlined or text links.
- **Developer vocabulary.** "MCPS", "cluster", "credibility score", "severity_score",
  "payload", "UUID", "null", raw error messages. Use staff words (see Copy below).

## Navigation and layout

- **Four places, always visible.** Overview, Reports, Map, Residents in the sidebar, with the current
  one clearly marked (soft blue highlight with a blue left bar, plus `aria-current`). Don't add hidden menus, hamburger
  menus on desktop, or nesting deeper than one level.
- **Titles match the nav.** The sidebar says "Residents", so the page title says "Residents".
- **A way back from every detail page** ("← Back to reports") that returns to the same filter.
- **Filters live in the URL** (`?status=active`), so refreshing, the browser's back button, and
  sharing a link keep the view. Show the active filter clearly.
- **Counts for waiting work** in the nav (pending IDs), never for decoration.
- **Fits 1366×768 without horizontal scrolling.** The key columns (priority, report, status) are
  visible without scrolling sideways; secondary columns can stack under a narrower width.
- **No modals for the main flows.** Updating a status or reviewing an ID happens on the page,
  next to the information it depends on. Use a confirmation only for rejecting an ID or marking
  a report Invalid, and ask for the reason there.

## Triage problems to fix

- **Urgency must be unmistakable.** Priority comes first in every list, sorted highest first,
  with the band name next to its color. Never rely on color alone.
- **Don't move rows under the cursor.** Live updates can re-sort the queue. Highlight new rows
  instead of hiding them, and keep the list from jumping while someone is reading or clicking
  (keep the scroll position, and avoid re-sorting the row being hovered when possible).
- **New reports must be noticed** without watching the screen: a visible toast and highlight,
  announced with `aria-live`. A sound, if added, must be optional and off by default.
- **Show live status honestly.** A "Live: updates automatically" indicator that turns into
  "Connecting…" when the connection drops. Never claim live data that isn't.
- **Time is local and readable.** Philippine time (`Asia/Manila`) via `lib/format.ts`, relative
  ("12 min ago") with the exact time on hover or alongside, and "Waited 25 min for signal"
  when a report sat on a phone.
- **Explain the score once, in words.** Every priority can be opened to show seriousness +
  nearby reports + verified reporter, adding up to the total. Don't show unexplained decimals.
- **Every action gets feedback.** A pending state ("Saving…"), then a clear result ("Status
  updated. The resident sees it in the app.") or an error that says what to do next.
- **Disabled buttons say why**, on or next to the button ("Choose a new status", "Approve is
  off because there's no ID photo to check").
- **Contact must be one click away.** A resident's mobile number in a report is a `tel:` link.
- **Empty states say what happens next.** "No active reports right now. New reports appear
  here automatically." Not a blank table or a cartoon.
- **Loading and errors are real states.** Show "Loading map…", and if data can't load, say so
  plainly with a way to retry. Don't show stale data as if it were current.

## Copy rules

Microcopy follows the same rules as the `no-ai-slop` writing skill; the ones that matter most
here:

- **Lead with the fact or action.** "3 reports nearby" not "This report appears to be
  associated with multiple related submissions."
- **One word per thing, everywhere.** Report (not ticket, case, incident, submission). Status
  names exactly as in `STAFF_STATUS_LABELS`: Received, In progress, Resolved, Invalid.
  "Verified resident", "Guest reporter", "Barangay ID", "nearby reports", "priority".
- **Staff wording vs. resident wording.** Staff see "Invalid"; residents see "Closed" in the
  app. The note a staff member writes goes to the resident, so the field label says so.
- **Concrete over vague.** "Not a real incident, a duplicate, or spam" explains Invalid;
  "Mark as invalid" alone does not.
- **No filler or hype.** Cut "Seamlessly manage", "Powerful insights", "Successfully",
  "Oops!", "Something went wrong :(". Say what happened and what to do.
- **Portability test.** If a string could appear unchanged in any other dashboard, rewrite it
  about Banaba, the report, the resident, or the barangay.
- **Numbers carry units and context.** "Priority 87 / 100", "accurate to about 30 m",
  "Waited 2 hr 5 min for signal".
- **Sentence case** for titles and buttons. No ALL CAPS except tiny section labels.
- **No em dashes** in UI strings. Use a period, a comma, or a middle dot (·).
- **Banned words:** seamless, effortless, empower, leverage, utilize, robust, elevate, journey,
  unlock, supercharge, insights, streamline.

Staff-facing text is English. Keep Tagalog only where the user asked for it.

## Color rules

All colors are tokens in `apps/web/app/globals.css` (`@theme`). Priority band colors live in
`PRIORITY_BAND_COLORS` in `apps/web/lib/labels.ts` (the map needs raw values). Never hard-code
another hex value in a component; use the Tailwind token classes (`bg-brand`, `text-muted`…).

| Token | Use for | Never for |
|---|---|---|
| `brand` (Philippine blue) / `brand-dark` / `brand-soft` | Primary buttons, links, the current sidebar section, selected filters, focus rings, "Received" | Warnings or errors |
| `sun` / `sun-soft` (sun yellow) | Top stripe, the "Connect" in the wordmark, highlight of new rows, pending-review badges | Text on white (too light), statuses |
| `urgent` / `urgent-soft` (red) | Critical priority, the new-report toast and "NEW" tag, reject actions, errors | Decoration, counts, anything not urgent |
| `warning` / `warning-soft` (orange) | "In progress", "Waited … for signal", connecting state | Errors |
| `success` / `success-soft` (green) | "Resolved", verified residents, approve, the live indicator | Neutral information |
| `page`, `surface`, `line`, `ink`, `muted` | Backgrounds, cards, borders, text | |

Priority bands (Critical red, High orange, Medium amber, Low blue) are the **only** place hue
encodes priority; categories don't get their own colors. Keep text contrast at least 4.5:1;
white text on band colors is checked for the badge's bold size.

## Accessibility and readability

- Body text at least 15px, secondary text at least 13px, numbers in `tabular-nums`.
- Click targets at least 40px tall on desktop and 44px on tablet.
- Visible focus ring on every interactive element; the whole flow (filter, open report, change
  status, approve ID) works with the keyboard alone.
- Real structure: one `h1` per page, lists as `ul`, labels tied to inputs, `role="alert"` for
  errors and `role="status"` for confirmations.
- Readable at 125% browser zoom and when projected.

## Code conventions that keep the UI consistent

- Data comes from `apps/web/lib/data.ts` (server, as the signed-in staff member). Labels from
  `lib/labels.ts` and `@banabaconnect/shared` (`CATEGORY_LABELS`, `VERIFICATION_LABELS`,
  `MCPS_WEIGHTS`). Times from `lib/format.ts`. Don't re-implement these in a page.
- Reuse `PriorityBadge`, `StatusPill`, `VerificationBadge`, `GuestBadge`, `FilterTabs`,
  `PageHeader` and `LiveIndicator` instead of new look-alikes.
- Staff actions go through the database functions (`update_report_status`,
  `review_verification`) in `app/(dashboard)/actions.ts`, so history and notifications are
  never skipped.

## Checklist before finishing a dashboard change

1. Can a staff member see the most urgent active report within two seconds of opening the page?
2. Does every number on screen come from real data, and would staff act on it?
3. Is every control either working or clearly unavailable, and does every disabled one say why?
4. Does every action show pending, success, and error states?
5. Do all colors follow the table, with nothing red that isn't urgent, and no color-only meaning?
6. Does every string pass the portability test, use the house terms, and avoid developer words?
7. Does it fit 1366×768 without sideways scrolling, and work with the keyboard?
8. Did the house style survive the change?
9. Did `npm run lint`, `npx tsc --noEmit` and `npm run build` in `apps/web` pass, and did you look
   at the result in a browser?

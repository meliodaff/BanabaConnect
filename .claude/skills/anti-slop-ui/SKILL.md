---
name: anti-slop-ui
description: Audit or improve BanabaConnect's mobile UI and UX for usability and "AI slop" - unclear next steps, dead or confusing controls, missing feedback, misused colors, and filler microcopy - while keeping the app's chosen eGovPH-style look. Use when designing, reviewing, or changing any screen, component, style, or user-facing text in apps/mobile, or when the user says the UI feels confusing, unintuitive, generic, or "AI-made".
---

# Anti-slop UI for BanabaConnect

Slop in an app is anything that makes the resident stop and think without a reason: a button
that does nothing, a status that doesn't say what happens next, a red badge on something that
isn't urgent, cheerful text that says nothing. This skill names those patterns and what to do
instead, inside the visual style the project already chose.

## Who the app is for

Decide every screen against this person:

- A Barangay Banaba resident, possibly panicking, wet, or holding a child, using one hand.
- A low- to mid-range Android phone, often in bright sun or at night, with weak or no signal.
- Reads English and Tagalog; may not read long text at all in the moment.
- Has one job on most visits: report what is happening, or check that the report went through.

## House style: keep it

The user chose an eGovPH-inspired look and asked to keep it after a stripped-down redesign.
Do not remove or flatten these:

- White home with the wordmark top bar, greeting row, round service icons in a 4-column grid,
  the light-blue report banner, and the "How reporting works" step cards.
- Icons in soft tinted circles, per-category icon colors, rounded cards with soft shadows.
- The raised round Report button in the middle of the tab bar.
- Bold titles and the existing type scale.

Improve usability inside this style: make actions clearer, states more visible, controls
honest, and text more useful. Propose larger visual changes to the user before making them.

## Two modes

**Audit.** List each problem below that appears, with `file:line`, the element or string, and
the fix in a few words. Do not change code. Rank by harm to the reporting flow.

**Apply.** Fix the problems with the smallest change that keeps the house style. Say what
changed and why.

## Interaction problems to fix

**Dead controls.** A bell, tile, or button that only says "coming soon" feels broken. Either
give it a real job (for example, the bell opens report updates) or mark it clearly as not
available (a gray "Soon" badge, a muted icon) so nobody expects it to work.

**Unclear next step.** Every screen should make the next tap obvious. A disabled button must
say why it is disabled, on or next to the button ("Waiting for your location").

**Missing feedback.** Every tap gets a visible response (pressed state, spinner, or a change
of screen). Every report shows where it is: waiting for signal, sending, or sent.

**Hidden content.** Horizontal scrollers must show that they scroll (a partly visible next
card is enough) and must not hide anything the resident needs to act.

**Unverifiable promises.** Say only what the app can guarantee right now. "Sent" means the
server accepted it, nothing more.

**Alarm misuse.** Red means emergency or a problem the resident must fix. A red badge on a
non-urgent item ("Soon") trains people to ignore red.

**Emergency shortcuts.** On any screen where a resident might be in immediate danger (home,
confirmation, offline states), a call to 911 should be one tap away.

**Small text and targets.** Body text at least 15px, secondary text at least 13px, tap targets
at least 44px, contrast at least 4.5:1. Sunlight and panic make small text unreadable.

## Copy patterns to cut

Microcopy follows the same rules as the `no-ai-slop` writing skill; the ones that matter most
in UI are:

- **Lead with the fact or action.** "Saved on your phone." not "Great news! Your report has
  been successfully saved."
- **Cut reassurance filler.** "Don't worry", "and that is okay", "No problem". State what
  happens next instead; that is what reassures.
- **No kickers.** Drop closing lines like "Stay safe and keep your phone with you." unless
  they are an instruction the resident needs.
- **Concrete over vague.** "Optional, but it helps a lot" says nothing; "A photo helps
  responders see how bad it is" says why.
- **Portability test.** If a string could appear unchanged in any other app, it is probably
  filler. Make it about Banaba, the report, the signal, or the barangay.
- **Same word for the same thing.** Pick one term and repeat it: "report", "send",
  "waiting for signal", "sent". Do not rotate "submit/transmit/deliver".
- **No em dashes** in UI strings. Use a period or a comma.
- **Banned words**: seamless, effortless, empower, leverage, utilize, robust, elevate,
  journey, unlock, supercharge.

**Language.** Tagalog labels under English ones (categories, the main report question) are
part of the design. Keep short friendly Tagalog touches the user already accepted (greeting,
"May emergency?"), but don't add new interjections without asking.

## Color rules

The palette follows the bright pink-magenta banaba flower (Lagerstroemia speciosa) that the
barangay is named after, with light and dark versions. The user found the earlier muted rose
dull, so keep tints saturated rather than washing them out.

For now the user has switched the app to a temporary neutral gray palette (`ACTIVE_PALETTE =
'neutral'` in `theme.ts`). The pink palette is kept there unchanged. The table below
describes token roles, which are the same in both palettes. All values live in `apps/mobile/src/theme.ts`;
never hard-code a hex value elsewhere. Read colors with `useTheme()` and build styles with
`useThemedStyles(createStyles)` so both modes work; never import a fixed palette into a screen.

| Token | Source | Use for |
|---|---|---|
| `emergency` (red) | Not from the tree, on purpose | Fill of report and 911 buttons (same red in both modes) |
| `emergencyText` | | Red text, icons, and outlines on a surface or soft tint |
| `primary` (magenta) | Banaba flowers | Navigation, links, tabs, service and category icons |
| `success` / `brandAccent` (leaf green) | Banaba leaves | Sent, location found, callable hotlines, "Connect" in the wordmark |
| `warning` (deep amber) | | Offline, waiting for signal, approximate location |
| `highlight` (stamen gold) | Yellow stamens | Decoration only: step icon circles, the banner halo. Never a status, never text |
| `background`, `text` (blush, plum-brown) | Petals and bark | Page backgrounds and text |
| Grays (`disabled`, `border`) | | "Soon" badges, inactive controls |

Check new color pairs in both modes; every text pair in the palette is at least 4.5:1.

Report categories share one icon color (`categoryIcon`); do not give each category its own hue.

## Checklist before finishing a UI change

1. Can a resident start a report from this screen in one tap, and is it obvious which tap?
2. Does every visible control either work or clearly look unavailable?
3. Does every disabled button say why?
4. Does every color follow the table above?
5. Does any string fail the portability test, use filler reassurance, or promise more than the
   code delivers?
6. Is text readable in sunlight (sizes and contrast above)?
7. Did the house style survive the change?
8. Did typecheck and lint pass, and did you look at the result (screenshot or device)?

---
name: anti-slop-ui
description: Audit or fix "AI slop" in BanabaConnect's mobile UI and UX - generic AI-generated visuals, dead or duplicate controls, decorative color, and filler microcopy. Use when designing, reviewing, or changing any screen, component, style, or user-facing text in apps/mobile, or when the user says the UI feels generic, cluttered, template-like, or "AI-made".
---

# Anti-slop UI for BanabaConnect

AI-generated interfaces share a look: every item in a rounded card, every icon in a pastel
circle, a rainbow of accent colors, an uppercase eyebrow over every heading, a carousel of
"how it works" cards, and cheerful filler text. None of it helps a resident report a flood at
night with one bar of signal. This skill names those patterns and says what to do instead.

## Who the app is for

Decide every screen against this person, not against a design gallery:

- A Barangay Banaba resident, possibly panicking, wet, or holding a child, using one hand.
- A low- to mid-range Android phone, often in bright sun or at night, with weak or no signal.
- Reads English and Tagalog; may not read long text at all in the moment.
- Has one job on most visits: report what is happening, or check that the report went through.

If an element does not help that job, a status the resident needs, or a real feature that
works today, remove it.

## Two modes

**Audit.** List each pattern below that appears, with `file:line`, the offending element or
string, and the fix in a few words. Do not change code. Rank by harm to the reporting flow.

**Apply.** Fix the patterns with the smallest change that removes them. Keep layout decisions
the user explicitly asked for (for example, the eGovPH-style home and the raised center Report
tab), but strip the slop inside them. Say what you removed and why.

## Visual patterns to cut

**Icon-in-a-tinted-circle everywhere.** A pastel disc behind every icon (steps, headers,
tiles, avatars, empty states) is the most recognizable AI-app tell. Use a bare icon at text
color or the primary color. Keep a filled shape only where it carries meaning, such as the
round Report button.

**Rainbow accents.** Eight category tints, green phone icons, purple shelters: color as
decoration. Color in this app is a signal, so each color has one meaning (see Color rules).
Categories are told apart by icon and label, not by hue.

**Card soup.** Wrapping every block in a white rounded card with a soft shadow flattens the
hierarchy; when everything is a card, nothing stands out. Use plain sections on the page
background with dividers and spacing. Reserve cards for items in a list and for the one
primary action.

**Uppercase eyebrows.** "STEP 1 OF 2", "MAY EMERGENCY?" in small tracked capitals over a
heading. Use sentence case, regular weight, muted color, or drop the label.

**Weight inflation.** 800-weight text all over the screen. Use at most two weights per screen
(700 for titles and the main action, 400 to 600 for the rest).

**Decorative art.** Concentric circles, glows, hero icons at 60px, illustrations that say
nothing. If it is not tappable and not information, cut it.

**Carousels for content.** Horizontal scrolls hide most of their cards off-screen. If the
content matters, stack it; if it does not, remove it.

## Interaction patterns to cut

**Dead controls.** A bell, tile, or button that only says "coming soon" looks like a broken
app during an emergency. Do not show unbuilt features as full-weight controls. If the user
wants them visible, group them as one quiet, non-interactive "Coming soon" line.

**Duplicate entry points on one screen.** The same action as a banner, a tile, and a button
makes the resident wonder which is the real one. One prominent primary action per screen;
the tab bar already gives global access.

**Fake personalization.** "Hi, Guest!" with a generic avatar is filler. Greet by name only
when there is an account; otherwise show something useful (the barangay, connection state,
waiting reports).

**Unverifiable promises.** "In under a minute", "Sent to the barangay" before a server
confirms it. Say only what the app can guarantee right now.

**Alarm misuse.** A red badge on a non-urgent item ("Soon") trains people to ignore red.

## Copy patterns to cut

Microcopy follows the same rules as the `no-ai-slop` writing skill; the ones that matter most
in UI are:

- **Lead with the fact or action.** "Saved on your phone." not "Great news! Your report has
  been successfully saved."
- **Cut reassurance filler.** "Don't worry", "and that is okay", "No problem", exclamation
  marks. State what happens next instead; that is what reassures.
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

**Language.** Use Tagalog where it does a job: category names under the English label, and
the main question on the report screen. Do not sprinkle decorative Tagalog ("Abangan!",
"Salamat!", "Kumusta!") into English sentences. Full Tagalog belongs in a proper language
setting, not in interjections.

## Color rules

| Color | Meaning | Use for |
|---|---|---|
| Red (`colors.emergency`) | Emergency action or danger | Report button, location/permission errors |
| Amber (`colors.warning`) | Waiting or degraded | Offline, waiting for signal, approximate location |
| Green (`colors.success`) | Done | Sent, location found |
| Blue (`colors.primary`) | Navigation and secondary actions | Links, tabs, secondary buttons |
| Ink and grays | Everything else | Text, icons, dividers |

Any other hue needs a reason written next to it in code.

## Checklist before finishing a UI change

1. Can a resident start a report from this screen in one tap, and is it obvious which tap?
2. Does every visible control work today?
3. Does every color follow the table above?
4. Are there icons in tinted circles, uppercase eyebrows, or cards wrapping single blocks?
5. Does any string fail the portability test, use filler reassurance, or promise more than the
   code delivers?
6. Is text readable in sunlight: body at least 15px, contrast at least 4.5:1, tap targets at
   least 44px?
7. Did typecheck and lint pass, and did you look at the result (screenshot or device)?

---
name: anti-slop-status-colors
description: Audit or fix how BanabaConnect colors states, both in the Command Dashboard (apps/web) and the resident app (apps/mobile), so status pills, priority badges, verification badges and map pins stop looking like generated "AI slop" (one pastel hue per state, traffic-light rainbows, colored text on matching tints) and instead use color only to show what needs attention. Use when adding or changing any status, priority, verification, sync or other state indicator, its colors, pills, badges, legends or map markers, or when the user says the status colors look generic, rainbow-like, noisy or "AI-made".
---

# Anti-slop status colors

Generated interfaces color states the same way every time: give each state its own hue, put
the label in that hue on a pastel tint of it (`bg-green-100 text-green-700`), and line the
pills up like a traffic light. The result looks busy, says nothing about what matters, and
competes with every other colored thing on the screen. In an emergency tool, that noise hides
the one state that needs a person.

**The rule: color shows attention, not identity.** The label and a small shape already say
which state it is. Color answers a different question: does someone need to act on this, and
how much? Most states need nothing, so most states are not colored.

## The slop patterns

Check every state indicator against these. Matching any of them is a defect.

1. **One hue per state.** Received blue, in progress orange, resolved green, invalid gray. Four
   hues for four labels, none of them meaningful.
2. **Pastel tint + same-hue text.** A soft-colored pill with darker text of the same hue for
   every state. It's the default look of generated UIs, and the text often fails contrast.
3. **Traffic-light ordering.** Red/orange/yellow/green (or blue) for an ordered scale like
   priority. Ordered magnitudes read as one scale only with **one hue, light to dark**.
4. **Green for "done".** Finished work glowing green competes for attention it no longer needs.
5. **Red for anything negative.** Rejected, closed, invalid and cancelled aren't emergencies.
   Red is reserved for "act now".
6. **Color as the only signal.** A state must be readable in grayscale: a label plus a shape.
7. **Two colored indicators fighting in one row.** If priority is colored, status in the same
   row must be calm.

## The system

### Pill anatomy (all states)

A **neutral pill**: surface background, thin gray border, ink text (13px, bold), and a small
leading **glyph** that carries the state's shape. Only the glyph takes color, and only when the
state needs attention or is in motion.

| Glyph | Meaning |
|---|---|
| ● filled dot | New, nobody has acted yet |
| ◐ half-filled circle | In motion (someone is on it, or it's sending) |
| ✓ check | Finished well |
| ⊘ circle with slash | Closed, not approved, invalid |
| ◷ clock / ring | Waiting on someone else |

### Exactly three color roles

| Role | Color | Use for | Pill treatment |
|---|---|---|---|
| **Act now** | Red ramp (`urgent` / priority ramp) | Critical and High priority; the new-report alert; for residents, a report that **hasn't reached the barangay** (amber `warning` on mobile) | Glyph and text in the attention color; a soft tint is allowed only here |
| **In motion** | Brand blue (`brand` / `primary`) | Received (new) dot; In progress; Sending | Glyph in brand; In progress may use the brand-soft fill |
| **Settled** | Ink and muted gray | Resolved, Invalid/Closed, Not verified, Not approved, Sent | Neutral pill; muted text for closed states |

The one exception: **Resolved and Verified** may use the success green **on the glyph only**
(never a green pill), as a small confirmation.

### Priority is one ordered scale

Priority is a magnitude, so it uses **one hue from light to dark**, validated with the dataviz
skill's checker (`validate_palette.js --ordinal`):

| Band | Map pin / legend | Badge |
|---|---|---|
| Critical | `#730910` | Solid `#730910`, white number |
| High | `#B5111A` | Solid `#B5111A`, white number |
| Medium | `#D9464E` | Soft `#FBE3E4` fill, `#E98A8F` border, `#8E0B12` number |
| Low | `#E98A8F` | White fill, `#E98A8F` border, muted number |

The band name next to the badge is **ink text**, never the band color (text wears text
tokens). Darker means more urgent; nothing else changes hue.

## Where the values live

- **Dashboard:** `apps/web/lib/labels.ts` (`PRIORITY_BAND_COLORS` for pins, `PRIORITY_BADGES`
  for badges), `apps/web/components/Badges.tsx` (`StatusPill`, `VerificationBadge`,
  `GuestBadge`, `PriorityBadge`, the glyphs), tokens in `apps/web/app/globals.css`.
- **Mobile:** `apps/mobile/src/features/queue/deliveryStatus.ts` (`deliveryStatusOf` returns a
  tone and colors from `theme.ts`); rendered in `app/(tabs)/reports.tsx` and `app/reports/[id].tsx`.

Never hard-code a status color in a page. Add or change it in these files.

## Two modes

**Audit.** List every state indicator, with `file:line`, which slop pattern it matches, and the
fix. Rank by harm: anything that could hide an urgent report first.

**Apply.** Change the shared components and value files above, not individual pages. Re-run
the contrast and ordinal checks for any new color.

## Checklist

1. Squint at a full screen: does the eye land on what needs action, and only there?
2. Does any state have its own hue just to be different? Remove it.
3. Is anything red that isn't urgent, or green that's merely finished?
4. Is priority one hue, light to dark, and does it pass `validate_palette.js --ordinal`?
5. Does every state read in grayscale (label + glyph)?
6. Is text at least 4.5:1 against its background, and pill text at least 13px?
7. Same state, same treatment in the dashboard and the app (the audience may change the words,
   not the color logic).

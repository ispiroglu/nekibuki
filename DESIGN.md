---
name: Nekibuki
description: A quiet field guide for the places you walk past.
colors:
  paper: "#faf9f5"
  ink: "#141413"
  surface: "#ffffff"
  muted-surface: "#f0eee6"
  muted-ink: "#6b6a63"
  border: "#e8e6dc"
  brand: "#0f5f57"
  brand-ink: "#0f5f57"
  brand-fg: "#f2fbf8"
  hud: "#6cc0b0"
  hud-fg: "#141413"
  photo-ink: "#ffffff"
  photo-shadow: "rgba(0, 0, 0, 0.4)"
  photo-shadow-soft: "rgba(0, 0, 0, 0.35)"
  mask-stencil: "#000000"
  destructive: "#c4472f"
  dark-paper: "#1f1e1d"
  dark-surface: "#2a2927"
  dark-muted-ink: "#a3a199"
typography:
  display:
    fontFamily: "Newsreader Variable, ui-serif, Georgia, serif"
    fontSize: "2.25rem–3rem"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  reading:
    fontFamily: "Newsreader Variable, ui-serif, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.06em"
  meta:
    fontFamily: "system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 500
    letterSpacing: "0.06em"
  ui:
    fontFamily: "system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
  list:
    fontFamily: "system-ui, -apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  lede:
    fontFamily: "Newsreader Variable, ui-serif, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "8.4px"
  md: "11.2px"
  lg: "14px"
  xl: "19.6px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    height: "44px"
  button-brand:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-fg}"
    rounded: "{rounded.full}"
    size: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  card-muted:
    backgroundColor: "{colors.muted-surface}"
    rounded: "{rounded.lg}"
---

# Design System: Nekibuki

## Overview

**Creative North Star: "The Field Notebook"**

Nekibuki should read like a small, well-made field guide carried in a coat pocket: warm paper,
near-black ink, one deep green mark in the margin, and photographs treated as the primary
evidence. The interface is quiet because the place is the loud part. Chrome recedes; editorial
type carries the voice; the accent appears only where the product wants to point at something.

The system is intentionally closer to a printed guide than to a travel app. Screens are built
from paper, hairlines and type rather than cards floating on gradients. The camera is the one
exception: there the interface becomes thin marks over a live photograph.

**Key Characteristics:**
- Warm paper, near-black ink, one deep green hue with explicit roles.
- Newsreader for editorial voice; system sans for controls and labels.
- Hairline rings (`0 0 0 1px`) instead of heavy shadows.
- Photography carries colour; UI chrome stays neutral.
- Motion is spring-based, interruptible, and removed under reduced motion.

## Colors

One hue, three jobs. The accent is a signature, not a theme.

### Primary
- **Petrol Green** (`#0f5f57`, `oklch(43.9% 0.073 184.5)`): the single brand hue. Used for the
  logo core, numbered reference dots, the send action, and brand-tinted text on paper.
- **Petrol Ink** (`#0f5f57` light, `#7fc7bb` dark): the accessible text version of the hue.
  Focus rings use this token, not the fill.
- **Petrol Foreground** (`#f2fbf8`): ink that sits on a petrol fill.

### Neutral
- **Paper** (`#faf9f5`): the page. Never pure white.
- **Ink** (`#141413`): primary text and primary buttons.
- **Surface** (`#ffffff`): cards that need to lift off the paper.
- **Muted Surface** (`#f0eee6`): quiet blocks, chips, secondary buttons.
- **Muted Ink** (`#6b6a63`): secondary text. Passes AA on paper.
- **Border** (`#e8e6dc`): hairlines and dividers.
- **Dark Paper** (`#1f1e1d`) and **Dark Surface** (`#2a2927`): the night reading mode.

### HUD
- **HUD Mint** (`#6cc0b0`) and **HUD Ink** (`#141413`): marks drawn over a photograph —
  viewfinder ring, scan line, active annotation marker. These are deliberately lighter and more
  chromatic than the brand ink because they must survive arbitrary photography.
- Active photo markers pair the HUD fill with a 2px `rgb(0 0 0 / 0.25)` ring. Without it, a pale
  marker disappears against a bright sky.
- Text sitting directly on a photograph uses `photo-ink` with a two-layer `photo-shadow`
  (`0 1px 2px` and `0 8px 30px`) so it survives both bright skies and dark façades. The
  `mask-stencil` black is a compositing stencil for fade masks, never a visible colour.

### Named Rules
**The One Hue Rule.** There is one chromatic accent. Destructive red is the only other saturated
colour, and it appears only on destructive actions.

**The Role Rule.** `--brand` fills, `--brand-ink` writes on paper, `--brand-fg` writes on brand,
`--hud` marks photography, `--hud-fg` writes on HUD. Never use one token for another role.

**The Anti-Terracotta Rule.** Terracotta `#d97757` is an experiment, not the identity. It reads as
another product's brand and fails 3:1 on paper.

## Typography

**Display Font:** Newsreader Variable (with Georgia, serif)
**Body Font:** system-ui / SF Pro Text (with Segoe UI, Roboto, sans-serif)
**Label Font:** system sans, uppercase with wide tracking

**Character:** A high-contrast literary serif for anything the traveller should *read*, and the
device's own sans for anything they should *operate*. The pairing makes the guide feel authored
while the controls feel native.

### Hierarchy
- **Display** (500, 2.25–3rem, 1.05): place names, screen titles, onboarding headlines.
  Letter-spacing −0.02em.
- **Headline** (500, 1.5rem, 1.15): section titles inside a report.
- **Reading** (400, 1.0625rem, 1.7): report prose and guide answers. Keep line length 55–70ch;
  never wider than 34rem for a measure.
- **Body** (400, 1rem, 1.5): controls, metadata, list rows.
- **Label** (500, 0.75rem, 0.06em, uppercase): group headings and eyebrow labels.
- **Meta** (500, 0.7rem, 0.06em, uppercase): the smallest allowed step, for dense metadata
  inside a card or a report header. Never smaller than 0.7rem (11.2px); the old onboarding
  0.6rem was below the floor.
- **UI** (500, 13px, 1.2): buttons, segmented controls, compact chips.
- **List** (400, 15px, 1.4): settings and history row titles.
- **Lede** (400, 1.375rem, 1.55): the report introduction, between Reading and Headline.

### Named Rules
**The Two-Voice Rule.** Serif is for content; sans is for chrome. A button label never uses the
serif, and a report paragraph never uses the sans.

**The 0.7rem Floor Rule.** Uppercase labels never go below 0.7rem (11.2px); use 12px where the
layout allows. If a label must be smaller to fit, the layout is wrong.

## Layout

The app is a three-panel horizontal deck — You, Camera, Places — with the camera in the middle.
Each panel fills the viewport height (`100dvh`) and respects safe areas. The camera is full-bleed;
the report is a single reading column capped at 42rem with 24px gutters; history and profile
content should cap at 42–48rem on wide screens instead of stretching edge to edge.

Spacing follows a 4px base scale. Screen gutters are 20px, card padding 16–20px, and vertical
rhythm comes in 8/12/16/24/32 steps. Report sections breathe at 32–40px; list rows stay at 48px
minimum height.

The floating bottom navigation is a three-item glass pill. Every scroll container must reserve at
least 7rem of bottom padding so the last row can clear it.

## Elevation & Depth

Depth is drawn with hairlines and translucency, not drop shadows. Cards at rest use a 1px border
or an inset ring; the ambient shadow is reserved for floating surfaces such as the navigation pill
and sheets. Over photography, depth comes from a dark scrim plus backdrop blur (`glass-dark`).

### Shadow Vocabulary
- **Hairline ring** (`box-shadow: 0 0 0 1px var(--border)`): cards and grouped rows at rest.
- **Ambient** (`0 1px 2px rgb(20 20 19 / .04), 0 12px 32px -22px rgb(20 20 19 / .28)`): floating
  navigation and popovers.
- **HUD separation** (`0 0 0 2px rgb(0 0 0 / .25)`): active markers on a photograph only.

### Named Rules
**The Hairline Rule.** If a surface sits on paper, prefer a 1px ring to a shadow. Shadows mean the
surface is floating, not that it is a card.

## Shapes

The base radius is 14px with a multiplicative scale: 8.4px (sm), 11.2px (md), 14px (lg),
19.6px (xl), 25.2px (2xl). Pills and circular controls use `9999px`. The camera's shutter is a
perfect circle; annotations are circles; panels use the 2xl step. Corners are soft but not bubbly.

Borders are always 1px and low-contrast. Never mix a 1px border with a wide soft shadow on the
same surface — that is the "AI card" tell.

## Components

- **Primary button:** ink fill, paper text, pill shape, 44px minimum height. This is the main
  action, not the brand colour.
- **Brand button:** petrol fill with petrol foreground. Reserved for the send action, avatar
  fallback and small identity marks.
- **Cards:** surface fill, 14px radius, hairline ring. One level of nesting only; a muted block
  inside a card is a *tile*, not another card.
- **Inputs:** muted surface, 11.2px radius, no visible border at rest, focus ring uses
  `--brand-ink`.
- **Chips/badges:** muted surface or brand at 15% opacity; 12px text minimum.
- **Annotations:** numbered circles over photography; inactive is black at 55% with white text,
  active is HUD fill with dark ink and a dark separation ring.
- **Bottom navigation:** glass pill, 44px targets, active item filled with ink.
- **Sheets:** 2xl top corners, paper background, drag handle, focus trapped, Escape closes.

## Do's and Don'ts

**Do**
- Let the photograph be the most colourful thing on the screen.
- Use the serif for reading and the sans for operating.
- Reserve brand green for moments that point at something: the logo, a numbered dot, a send arrow.
- Use the HUD tokens for anything drawn over a photo, including the viewfinder.
- Keep labels at 11.2px or larger (12px where space allows) and body text at 16px or larger.
- Verify contrast before shipping: 4.5:1 for text, 3:1 for UI and focus rings.

**Don't**
- Don't reintroduce terracotta as the default; it is another brand's signature.
- Don't use the brand fill for large backgrounds or long text blocks.
- Don't put a card inside a card inside a card.
- Don't use pure black or pure white as page colours.
- Don't animate layout properties; animate transform and opacity only.
- Don't block pinch zoom, and don't ship a control below 44×44px.

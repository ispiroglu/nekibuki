---
id: APP-GLOSSARY
type: glossary
title: app — glossary
context: app
issue: 7
related: [CONTEXT-APP, APP-DOMAIN-MODEL, BEHAVIOR-APP-READING-MEASURE]
supersedes: null
---

# app — glossary

## Domain language

- **Guide** — the short reading about one photographed place: intro, trivia cards, sections.
- **Place** — a guide the traveller has kept, with where and when it was collected.
- **Walk** — an ordered set of stops the traveller can follow in one outing.
- **Onboarding** — the short introduction shown after first sign-in; three slides, no
  configuration, not a tutorial.

## Layout language

- **Reading measure** — the width of the column a traveller reads in. A shared design-system
  property, not a per-screen choice.
- **Full-screen surface** — a screen that fills the viewport height and puts its content in the
  reading measure: sign-in, introduction, profile, history, report, legal. The camera is
  full-bleed and deliberately not in this set.
- **Sign-in surface** — the login screen shown before a session exists.
- **Introduction** — the onboarding surface; its welcome header, slide area and footer share one
  column.
- **Profile surface** — the reference surface whose centred 42rem column the other surfaces
  match.
- **Gutter** — the horizontal padding between the viewport edge and the content. 20px at phone
  widths.
- **Wide viewport** — 1024px wide and wider, where the reading measure applies.
- **Short-landscape split** — the two-column layout the sign-in and introduction surfaces use on
  landscape viewports at most 560px high (for example 844×390).
- **Layout check** — the repeatable browser measurement `bun run layout:check`
  (`scripts/layout-check.mjs`) that proves the measure, the gutters and the split layouts.

---
id: APP-DOMAIN-MODEL
type: domain-model
title: app — domain model
context: app
issue: 7
related: [CONTEXT-APP, APP-GLOSSARY, BEHAVIOR-APP-READING-MEASURE]
supersedes: null
---

# app — domain model

The `app` context owns no aggregate, entity, value object, command, event or state transition of
its own. It is the traveller's device experience: presentation plus a local copy of state whose
shape is defined by `api` and `shared`.

- **Guide**, **Place** and **Walk** are presented here and kept locally, but their vocabulary
  belongs to the shared kernel (`shared/`) and their authoritative state to `api`.
- **Onboarding** is a presentation concept: three slides shown after first sign-in, carrying no
  configuration and no stored value beyond "seen".
- **Reading measure** is a presentation property of a surface, not a domain concept. It is not
  stored, not sent and not validated; see `BEHAVIOR-APP-READING-MEASURE`.

## Effect of the reading-measure change

The reading-measure requirements add and change no aggregate, entity, value object, command,
event or state transition. No store, call, payload or stored value changes — the same local state
is read and written, only its layout on a wide viewport differs. The context model is therefore
unchanged by `SPEC-FEAT-0001`.

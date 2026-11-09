---
id: CONTEXT-MAP
type: context-map
title: Bounded contexts and their relationships
context: shared
issue: 7
related: [CONTEXT-APP, CONTEXT-API, CONTEXT-SHARED]
supersedes: null
---

# Context map

Three bounded contexts, split along the same line the code is split: the device-facing
experience, the edge service that answers it, and the vocabulary they share.

## Registered contexts

| Context | Path | Requirement prefix | Role |
| --- | --- | --- | --- |
| `app` | `src/` | APP | The traveller's device experience: screens, layout, local state, on-device history. |
| `api` | `worker/` | API | The edge service on a single Cloudflare Worker: auth, guides, chat, photos, walks, D1/R2 storage. |
| `shared` | `shared/` | SHR | The vocabulary both sides import: guide and walk shapes, mock guides. A shared kernel, not a service. |

## Relationships

```text
            uses, over HTTPS/JSON            conformist
   app ───────────────────────────────▶ api ──────────▶ model provider (vision)
    │                                    │
    │  shared kernel                     │  D1, R2 (private)
    └──────────── shared ◀───────────────┘
```

- **`app` → `api`: downstream, customer/supplier.** The device experience calls the edge
  service over HTTPS and JSON, and conforms to the service's existing shapes rather than
  negotiating them. The service can change a response only with the app in the same release;
  both are deployed together on one Worker. Failure of `api` degrades the app to its on-device
  demo path, so `app` must never block on a call it can answer locally.
- **`app` → `shared`: shared kernel.** Guide, walk and report vocabulary is imported by both
  sides. A change here is a change to both contexts and needs both owners to agree. This is the
  only place where a change is naturally breaking for the whole system.
- **`api` → model provider: conformist, with an anti-corruption boundary.** The provider's
  answer is not trusted as-is; the service validates and reshapes it into the shared
  vocabulary before anything is stored or returned.
- **`api` → storage: supplier.** D1 and R2 are infrastructure behind the service; no other
  context reads them directly. Photos are never public: a route in `api` mediates every read.

## Change impact of the current change (FEAT-0001)

The change is confined to `app` and to presentation only: the reading measure of full-screen
surfaces on wide viewports. It changes no call, no payload and no stored value. `api` and
`shared` are unaffected, and no relationship in this map changes.

## Rules

- A context is named here and in `contexts.yaml`; both lists must agree.
- Cross-context calls go through the contracts under `docs/contexts/<ctx>/contracts/` or the
  shared kernel. No context reads another's tables, buckets or modules directly.
- When a relationship's direction or integration style changes, change this map in the same
  change that changes the code.

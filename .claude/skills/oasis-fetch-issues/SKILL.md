---
name: oasis-fetch-issues
description: List this repository's factory:ready GitHub issues, let the user pick one by number, and record the choice in the oasis run store. Use when the user runs /oasis-fetch-issues or asks which issue the factory should run next.
---

# oasis-fetch-issues

1. Run `oasis issues` in the repository. It prints each `factory:ready` issue with its number, kind and line.
2. If it prints no issues, say so and stop.
3. Show the list and ask the user to pick one by number. Do not pick for them.
4. Run `oasis select <n>` with the number they chose. It writes the choice to the run store.
5. End with exactly one line and nothing after it:

```
oasis run <n>
```

Do not run it. Do not add other steps.

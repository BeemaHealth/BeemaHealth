# New Feature Doc

Creates a `docs/features/<feature>.md` doc for a platform feature area that doesn't have one yet.

## Usage

```
/new-feature-doc <feature-name>
```

Example: `/new-feature-doc consent-flow`

## What to include in the doc

Read the relevant backend models, frontend routes, and services for the feature, then write a doc that covers:

1. **What it does** — one paragraph explaining the feature's purpose and why it exists
2. **Data model** — the key Django models, their fields, and how they relate
3. **How it works** — the end-to-end flow from user action to database write, including any feature flags or fallback behavior
4. **Staff workflow** — if staff interact with this feature, describe the CRM interface
5. **Key files** — a table of the most important files (models, serializers, views, frontend routes, services)

## Rules

- Keep it factual — describe what the code does, not what you want it to do
- Use present tense
- No code snippets unless a pattern is non-obvious
- Save to `docs/features/<feature-name>.md` (kebab-case)
- After creating the file, add a row to the Orient table in both `AGENTS.md` and `CLAUDE.md` pointing to the new doc

## Keeping docs in sync

If you are working in a feature area and the existing `docs/features/` doc disagrees with the code, **stop and report the discrepancy** before continuing:
- State what the doc says
- State what the code actually does
- Give a recommendation (update the doc, or update the code)

Wait for the user to decide. Do not silently fix either side.

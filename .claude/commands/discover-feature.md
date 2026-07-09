# Discover Feature

Run this command **before writing production code** on any non-trivial feature. It walks through Anthropic's pre-implementation unknowns workflow ([Finding your unknowns](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns)) so you clarify blind spots, react to prototypes, resolve ambiguity, and approve a plan — **then** build.

**When to run:** new flows, new portal tabs, payment/integration work, anything touching PHI, or any feature where wrong assumptions would be expensive to undo.

**When to skip:** one-line fixes, copy tweaks, tests-only changes, or work where the spec is already locked (e.g. an approved plan in `.claude/plans/`).

**Prerequisite:** run `/start-feature` first if you need a clean feature branch. This command does not create branches.

---

## Phase 0 — Frame the work (1 turn)

Collect from the user (or infer from chat):

1. **What they're trying to build** — one sentence goal.
2. **Their experience level** with this area (codebase module, domain, vendor API).
3. **What they already know vs. what feels fuzzy** — known unknowns, if any.
4. **Prototype mode** — pick one:
   - **Greenfield UI** — several wildly different layout directions to react to.
   - **Convention fit** — one interactive mock that mirrors existing portal/nav patterns (new tab, new section card, new questionnaire step).
   - **Backend / integration only** — approach sketches (data model + API shape variants), no visual mock.
   - **Skip prototypes** — user can verbalize everything; go straight to interview after blindspot pass.

Read relevant `docs/features/` docs and skim the code paths that will be touched. Flag doc/code discrepancies before continuing — do not silently fix either side.

---

## Phase 1 — Blindspot pass

**Goal:** surface unknown unknowns so the user's next prompts are better. **Do not implement.**

Explore the territory: relevant modules, migrations, prior art in the repo, vendor constraints, HIPAA/PHI boundaries, existing tests, and feature flags.

Report in four sections:

| Section | Content |
|---------|---------|
| **Landmines** | Mistakes newcomers make here; repo potholes (deprecated paths, half-migrated patterns, misleading names). |
| **Hidden context** | Decisions already made that constrain the work (invariants, data ownership per `backend/DATABASE.md`, compliance rules). |
| **What good looks like** | 2–3 examples from this repo (or vendor docs) that calibrate quality. |
| **Questions you should be asking** | 3–5 questions an expert would ask before starting, with your best guess at each answer. |

End with a **rewritten feature request** that incorporates what you found — show the gap between the user's map and the territory.

If the area is simple, say so plainly: *"No significant blindspots — here's why."* Then ask whether to skip to Phase 3 or proceed with a lighter prototype.

**Stop and wait** for the user to react (corrections, "didn't know that", priorities) before Phase 2.

---

## Phase 2 — Brainstorm & prototype

**Goal:** find unknown knowns — things the user recognizes when they see them but can't articulate upfront.

### Rules

- **Nothing here is production code.** No backend routes, no migrations, no wiring into the real app.
- **One decision per round.** Layout, then flow, then data model — not all at once.
- **3–5 variations that are genuinely different**, not shades of the same idea. Label each with the belief it bets on.
- After reactions, **verbalize the criterion learned**: *"You rejected X twice → the real requirement is Y."*

### Beema-specific prototype surfaces

| Situation | Deliverable |
|-----------|-------------|
| Portal / dashboard UI | Cursor **Canvas** (`.canvas.tsx` in the workspace `canvases/` dir) using `design-tokens.ts` semantics — section tones, `AccountSectionCard` patterns. Link the canvas file for the user to open beside chat. |
| Marketing / landing explorations | Single self-contained **HTML file** with fake data, 3–4 wildly different directions. |
| New nav tab or portal section | **Convention audit** + one interactive mock: read an existing tab's route/components, list conventions (layout, tone, empty states, edit/save pattern), then prototype the new tab following or deliberately breaking those conventions — user picks. |
| Questionnaire / dynamic form field | Mock the **step in isolation** with fake answers; show placement, validation copy, and advance behavior — no API calls. |
| Backend / Stripe / integration | 2–3 **approach cards**: data model sketch, API surface, main tradeoff, what breaks if wrong. |

**Stop and wait** for the user to pick, mix, or reject directions before Phase 3.

---

## Phase 3 — Interview

**Goal:** close remaining gaps one question at a time.

1. Read everything established: request, blindspot pass, prototype reactions, relevant code.
2. Build a private list of open ambiguities; sort by blast radius:
   - **First:** architecture-changers (data model, API shape, UX flow, compliance posture).
   - **Then:** behavior definers (edge cases, failure modes, permissions, defaults).
   - **Last:** polish (naming, copy) — often propose and move on.
3. Ask **exactly one question per turn.** For each: why it matters, 2–3 concrete options with your recommendation, accept "you decide" (you then own the decision).
4. Every 3–4 questions: **checkpoint** — tight bullet list of decisions so far.
5. **Stop** when remaining unknowns are cheaper to discover during implementation than to ask now — say that out loud.

Never ask what is answerable from the codebase; go look instead. If an answer contradicts an earlier decision, flag the conflict immediately.

---

## Phase 4 — Implementation plan

**Goal:** put reversible-but-expensive decisions in front of the user while changing them is still free.

Write the plan to:

```
.claude/plans/<feature-slug>.md
```

Use kebab-case slug matching the feature branch name when possible.

### Plan structure

1. **Summary (3 lines)** — what is being built, approach chosen, single riskiest assumption.
2. **Decisions you'll probably want to tweak** — data model, types (`src/lib/types/mvp.ts`), API shapes, user-facing flows. For each: choice made, one alternative, cost of changing later.
3. **Known unknowns & defaults** — what ambiguity remains, default you'll take, signal that triggers a pivot.
4. **Compliance & validation** — PHI boundaries, validators needed (frontend + backend + tests), legal gates if money/clinical copy is involved.
5. **Mechanical work (compressed)** — migrations, wiring, tests, feature flags. Trust zone — keep brief.
6. **Out of scope** — explicit non-goals so scope creep is visible.
7. **Review request** — 2–4 specific yes/no or pick-one items before coding starts.

If the plan is long, offer a collapsible HTML companion — but the markdown file in `.claude/plans/` is the source of truth.

**Stop.** Do not write production code until the user approves the plan (or explicitly approves section-by-section).

---

## Phase 5 — Hand off to build

When the plan is approved, tell the user:

> "Plan approved at `.claude/plans/<slug>.md`. Ready to implement on `feature/<name>`. Say **go** (or paste the plan path) to start building. I'll follow `AGENTS.md` and keep `implementation-notes.md` for deviations."

During implementation (separate session or continued chat):

- Follow `/start-feature` Step 4–6 (AGENTS.md workflow + testing gate).
- Keep `.claude/plans/implementation-notes-<slug>.md` for deviations: edge cases that force a pivot, conservative choices made, things to revisit next attempt.

---

## Guardrails (all phases)

- **No production code** until Phase 4 plan is approved.
- **No `git push`** — user pushes when ready.
- **PHI:** never put real patient data in prototypes, canvases, or plan examples.
- **Doc drift:** if `docs/features/` disagrees with code, report it; don't silently fix.
- **Don't bundle interview questions.** One at a time.
- **Don't converge prototypes early** to what you'd pick — span the decision space.
- If the user says **"skip to plan"** or **"I know what I want"**, confirm what's waived and run a abbreviated blindspot pass (landmines + compliance only) before planning.

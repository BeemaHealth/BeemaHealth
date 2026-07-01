# Start Feature

Run this skill at the beginning of every new feature. It checks for existing work, sets up a fresh clone in the shared workspace, and defines the testing gate.

## Workspace layout

All Aretide clones live as sibling directories under `/Users/mattaertker/Documents/Github/`:

```
Github/
  Aretide/                          ← canonical working copy (main)
  Aretide-feature-consent-flow/     ← feature clone example
  Aretide-feature-lp-ab-testing/    ← another feature clone
```

Open `/Users/mattaertker/Documents/Github/` as the workspace root in your IDE to see all clones at once.

---

## Step 1 — Check for existing feature branches

Before creating anything, check whether relevant work already exists.

**Check existing clone directories:**
```bash
ls /Users/mattaertker/Documents/Github/ | grep -i Aretide
```

**Check remote branches on GitHub:**
```bash
git -C /Users/mattaertker/Documents/Github/Aretide ls-remote --heads origin | grep feature/
```

**Check local branches too — not just remote:**
```bash
git -C /Users/mattaertker/Documents/Github/Aretide branch --list 'feature/*'
```
Local `main` can be ahead of `origin/main` (uncommitted work gets pushed in batches, not every session), so a branch or commits can exist locally with nothing on GitHub to show for it. Always check both.

Show the user what exists. If any branch or clone looks related to the requested feature, ask:

> "I found existing branch(es) that may be relevant: `feature/xxx`. Would you like to continue work there instead of starting a new branch?"

Wait for the user to decide before proceeding. If they say yes, check out the existing clone (or clone that branch) instead of creating a new one.

---

## Step 2 — Propose a branch name

Read the feature request and propose a name in the format:

```
feature/<short-but-understandable-name>
```

Good examples: `feature/consent-flow-redesign`, `feature/refill-request-api`, `feature/staff-patient-notes`

The name should be specific enough to understand at a glance — not `feature/updates` or `feature/fix`.

Ask the user to confirm or adjust the name. Do not create the branch until they approve.

---

## Step 3 — Clone into the workspace

Clone from the **local canonical checkout**, not GitHub — local `main` is the source of truth and may hold commits `origin/main` doesn't have yet. Cloning from `https://github.com/...` would silently drop that work. After cloning, repoint `origin` back to GitHub so pushes in Step 6 go to the right place:

```bash
git clone /Users/mattaertker/Documents/Github/Aretide /Users/mattaertker/Documents/Github/Aretide-<approved-name>
cd /Users/mattaertker/Documents/Github/Aretide-<approved-name>
git checkout -b feature/<approved-name>
git remote set-url origin https://github.com/Aretide/Aretide.git
```

Example for `feature/refill-request-api`:
```bash
git clone /Users/mattaertker/Documents/Github/Aretide /Users/mattaertker/Documents/Github/Aretide-refill-request-api
cd /Users/mattaertker/Documents/Github/Aretide-refill-request-api
git checkout -b feature/refill-request-api
git remote set-url origin https://github.com/Aretide/Aretide.git
```

Confirm to the user: **"Cloned into `Aretide-<name>/` and on branch `feature/<name>`. Ready to start work."**

---

## Step 4 — Do the work

Follow the standard task workflow (`AGENTS.md`):
- Orient: read the relevant `docs/features/` doc; flag any discrepancies against the code before starting
- Implement with defense in depth — validators at every layer (UI → serializer → ORM)
- Commit logical checkpoints as you go — do not accumulate one giant diff
- Keep migrations in the same commit as the model changes that require them
- Never commit to `main`; no `--no-verify`

---

## Step 5 — Testing gate (required before declaring done)

**All of the following must pass. Report each result in chat.**

```bash
npm run test:all          # frontend (Vitest) + backend unit tests + smoke_clinical_flow
npx tsc --noEmit          # required when any TS/TSX changed — not optional
FILES=$(git diff --name-only --diff-filter=ACMR origin/main -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
```

- Fix all failures — do not skip or defer
- If new behaviour was added, write tests for it first, then confirm they pass
- Report: test count + pass/fail for each suite, `tsc --noEmit` result, ESLint result on changed files

---

## Step 6 — Hand off to the user

**Do not push. The user pushes when ready.**

When work is done and tests pass, say:

> "All tests pass on branch `feature/<name>` in `Aretide-<name>/`. When you're ready to merge, push with:
> ```
> git push -u origin feature/<name>
> ```
> Then open a PR on GitHub."

Never run `git push`. Never open a PR without the user explicitly asking.
